package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const maxDemandDialogFileBytes int64 = 128 * 1024 * 1024

// ─── Types ────────────────────────────────────────────────────────────────────

type Place struct {
	Code          string     `json:"code"`
	Name          string     `json:"name"`
	Locale        string     `json:"locale,omitempty"`
	BBox          [4]float64 `json:"bbox"`
	ThumbnailBBox [4]float64 `json:"thumbnailBbox,omitempty"`
}

type GeneratorConfig struct {
	TileZoomLevel int     `json:"tile-zoom-level"`
	Places        []Place `json:"places"`
}

type OutputFile struct {
	Name       string  `json:"name"`
	SizeMb     float64 `json:"sizeMb"`
	ModifiedAt string  `json:"modifiedAt"`
}

type PlaceOutput struct {
	Code  string       `json:"code"`
	Files []OutputFile `json:"files"`
}

type DemandPoint struct {
	ID        string     `json:"id"`
	Location  [2]float64 `json:"location"`
	Jobs      float64    `json:"jobs"`
	Residents float64    `json:"residents"`
	PopIDs    []string   `json:"popIds"`
}

type Pop struct {
	ID              string  `json:"id"`
	ResidenceID     string  `json:"residenceId"`
	JobID           string  `json:"jobId"`
	Size            float64 `json:"size"`
	DrivingDistance float64 `json:"drivingDistance"`
	DrivingSeconds  float64 `json:"drivingSeconds"`
}

type DemandData struct {
	Points []DemandPoint `json:"points"`
	Pops   []Pop         `json:"pops"`
}

type NodeJSStatus struct {
	Available bool   `json:"available"`
	Version   string `json:"version"`
	Path      string `json:"path"`
}

type Response[T any] struct {
	Status string `json:"status"` // "success" | "error"
	Data   T      `json:"data,omitempty"`
	Error  string `json:"error,omitempty"`
}

func ok[T any](data T) Response[T] {
	return Response[T]{Status: "success", Data: data}
}

func errResp[T any](err error) Response[T] {
	return Response[T]{Status: "error", Error: err.Error()}
}

// ─── App ──────────────────────────────────────────────────────────────────────

type App struct {
	ctx       context.Context
	dataDir   string
	scriptDir string

	scriptMu     sync.Mutex
	scriptCancel context.CancelFunc
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Data dir: same directory as the executable (or CWD in dev mode)
	exe, err := os.Executable()
	if err == nil {
		a.dataDir = filepath.Dir(exe)
	} else {
		a.dataDir, _ = os.Getwd()
	}

	// In development (wails dev), dataDir ends up being the temp build dir.
	// The actual project root is two levels up from that.
	// We detect dev mode by checking if ../scripts exists.
	cwd, _ := os.Getwd()
	if _, err := os.Stat(filepath.Join(cwd, "scripts")); err == nil {
		a.dataDir = cwd
	}

	a.scriptDir = filepath.Join(a.dataDir, "scripts")
}

func (a *App) shutdown(_ context.Context) {
	a.StopScript()
}

// ─── Config ───────────────────────────────────────────────────────────────────

func (a *App) configPath() string {
	return filepath.Join(a.dataDir, "config.json")
}

func (a *App) GetConfig() Response[GeneratorConfig] {
	data, err := os.ReadFile(a.configPath())
	if errors.Is(err, fs.ErrNotExist) {
		return ok(GeneratorConfig{TileZoomLevel: 13, Places: []Place{}})
	}
	if err != nil {
		return errResp[GeneratorConfig](err)
	}
	var cfg GeneratorConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return errResp[GeneratorConfig](err)
	}
	if cfg.Places == nil {
		cfg.Places = []Place{}
	}
	return ok(cfg)
}

func (a *App) SaveConfig(cfg GeneratorConfig) Response[bool] {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return errResp[bool](err)
	}
	if err := os.WriteFile(a.configPath(), data, 0644); err != nil {
		return errResp[bool](err)
	}
	return ok(true)
}

// ─── Output files ─────────────────────────────────────────────────────────────

func (a *App) ListOutputFiles() Response[[]PlaceOutput] {
	processedDir := filepath.Join(a.dataDir, "processed_data")
	entries, err := os.ReadDir(processedDir)
	if errors.Is(err, fs.ErrNotExist) {
		return ok([]PlaceOutput{})
	}
	if err != nil {
		return errResp[[]PlaceOutput](err)
	}

	var result []PlaceOutput
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dir := filepath.Join(processedDir, e.Name())
		fileEntries, _ := os.ReadDir(dir)

		var files []OutputFile
		for _, f := range fileEntries {
			if f.IsDir() {
				continue
			}
			info, err := f.Info()
			if err != nil {
				continue
			}
			sizeMb := math.Round(float64(info.Size())/1_048_576*100) / 100
			files = append(files, OutputFile{
				Name:       f.Name(),
				SizeMb:     sizeMb,
				ModifiedAt: info.ModTime().Format(time.RFC3339),
			})
		}
		if files == nil {
			files = []OutputFile{}
		}
		result = append(result, PlaceOutput{Code: e.Name(), Files: files})
	}
	if result == nil {
		result = []PlaceOutput{}
	}
	return ok(result)
}

// ─── Demand data ──────────────────────────────────────────────────────────────

func (a *App) demandPath(code string) string {
	return filepath.Join(a.dataDir, "processed_data", code, "demand_data.json")
}

func (a *App) ReadDemandData(code string) Response[DemandData] {
	data, err := os.ReadFile(a.demandPath(code))
	if errors.Is(err, fs.ErrNotExist) {
		return ok(DemandData{Points: []DemandPoint{}, Pops: []Pop{}})
	}
	if err != nil {
		return errResp[DemandData](err)
	}
	var d DemandData
	if err := json.Unmarshal(data, &d); err != nil {
		return errResp[DemandData](err)
	}
	if d.Points == nil {
		d.Points = []DemandPoint{}
	}
	if d.Pops == nil {
		d.Pops = []Pop{}
	}
	return ok(d)
}

func (a *App) WriteDemandData(code string, data DemandData) Response[bool] {
	dir := filepath.Join(a.dataDir, "processed_data", code)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return errResp[bool](err)
	}
	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return errResp[bool](err)
	}
	if err := os.WriteFile(a.demandPath(code), raw, 0644); err != nil {
		return errResp[bool](err)
	}
	return ok(true)
}

// ─── Demand file dialogs ──────────────────────────────────────────────────────

func (a *App) OpenDemandFileDialog() Response[DemandData] {
	path, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Open demand data file",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "JSON files", Pattern: "*.json"},
		},
	})
	if err != nil || path == "" {
		return Response[DemandData]{Status: "cancelled"}
	}
	info, err := os.Stat(path)
	if err != nil {
		return errResp[DemandData](err)
	}
	if info.Size() > maxDemandDialogFileBytes {
		return errResp[DemandData](fmt.Errorf("selected file is too large (%0.1f MB). Please use a file under 128 MB", float64(info.Size())/1024/1024))
	}

	f, err := os.Open(path)
	if err != nil {
		return errResp[DemandData](err)
	}
	defer f.Close()

	var d DemandData
	dec := json.NewDecoder(f)
	if err := dec.Decode(&d); err != nil {
		return errResp[DemandData](err)
	}
	if d.Points == nil {
		d.Points = []DemandPoint{}
	}
	if d.Pops == nil {
		d.Pops = []Pop{}
	}
	return Response[DemandData]{Status: "success", Data: d}
}

func (a *App) SaveDemandFileAs(data DemandData) Response[bool] {
	path, err := wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title:           "Save demand data file",
		DefaultFilename: "demand_data.json",
		Filters: []wailsruntime.FileFilter{
			{DisplayName: "JSON files", Pattern: "*.json"},
		},
	})
	if err != nil || path == "" {
		return Response[bool]{Status: "cancelled"}
	}
	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return errResp[bool](err)
	}
	if err := os.WriteFile(path, raw, 0644); err != nil {
		return errResp[bool](err)
	}
	return ok(true)
}

// ─── Script runner ────────────────────────────────────────────────────────────

func (a *App) findNodeJS() (string, error) {
	name := "node"
	if runtime.GOOS == "windows" {
		name = "node.exe"
	}
	path, err := exec.LookPath(name)
	if err != nil {
		return "", fmt.Errorf("node not found in PATH — install Node.js from https://nodejs.org")
	}
	return path, nil
}

func (a *App) CheckNodeJS() Response[NodeJSStatus] {
	nodePath, err := a.findNodeJS()
	if err != nil {
		return ok(NodeJSStatus{Available: false})
	}
	out, err := exec.Command(nodePath, "--version").Output()
	version := ""
	if err == nil {
		version = strings.TrimSpace(string(out))
	}
	return ok(NodeJSStatus{Available: true, Version: version, Path: nodePath})
}

type scriptLogEvent struct {
	Level string `json:"level"`
	Text  string `json:"text"`
	Ts    int64  `json:"ts"`
}

type scriptExitEvent struct {
	Code *int  `json:"code"`
	Ts   int64 `json:"ts"`
}

func intPtr(v int) *int { return &v }

func (a *App) RunScript(scriptName string, placeCode string) {
	a.scriptMu.Lock()
	if a.scriptCancel != nil {
		a.scriptCancel()
	}
	ctx, cancel := context.WithCancel(a.ctx)
	a.scriptCancel = cancel
	a.scriptMu.Unlock()

	go func() {
		defer func() {
			a.scriptMu.Lock()
			a.scriptCancel = nil
			a.scriptMu.Unlock()
		}()

		nodePath, err := a.findNodeJS()
		if err != nil {
			wailsruntime.EventsEmit(a.ctx, "script:log", scriptLogEvent{
				Level: "error", Text: err.Error(), Ts: time.Now().UnixMilli(),
			})
			code := 1
			wailsruntime.EventsEmit(a.ctx, "script:exit", scriptExitEvent{Code: &code, Ts: time.Now().UnixMilli()})
			return
		}

		scriptFile := filepath.Join(a.scriptDir, "src", scriptName+".js")
		if _, err := os.Stat(scriptFile); err != nil {
			wailsruntime.EventsEmit(a.ctx, "script:log", scriptLogEvent{
				Level: "error", Text: fmt.Sprintf("Script not found: %s", scriptFile), Ts: time.Now().UnixMilli(),
			})
			code := 1
			wailsruntime.EventsEmit(a.ctx, "script:exit", scriptExitEvent{Code: &code, Ts: time.Now().UnixMilli()})
			return
		}

		args := []string{scriptFile}
		if placeCode != "" {
			args = append(args, "--place", placeCode)
		}

		cmd := exec.CommandContext(ctx, nodePath, args...)
		cmd.Dir = a.scriptDir
		cmd.Env = append(os.Environ(), "FORCE_COLOR=0")

		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()

		if err := cmd.Start(); err != nil {
			wailsruntime.EventsEmit(a.ctx, "script:log", scriptLogEvent{
				Level: "error", Text: fmt.Sprintf("Failed to start: %v", err), Ts: time.Now().UnixMilli(),
			})
			code := 1
			wailsruntime.EventsEmit(a.ctx, "script:exit", scriptExitEvent{Code: &code, Ts: time.Now().UnixMilli()})
			return
		}

		streamLines := func(r io.Reader, level string) {
			scanner := bufio.NewScanner(r)
			for scanner.Scan() {
				line := scanner.Text()
				if line == "" {
					continue
				}
				wailsruntime.EventsEmit(a.ctx, "script:log", scriptLogEvent{
					Level: level, Text: line, Ts: time.Now().UnixMilli(),
				})
			}
		}

		var wg sync.WaitGroup
		wg.Add(2)
		go func() { defer wg.Done(); streamLines(stdout, "info") }()
		go func() { defer wg.Done(); streamLines(stderr, "warn") }()
		wg.Wait()

		err = cmd.Wait()
		exitCode := 0
		if err != nil {
			var exitErr *exec.ExitError
			if errors.As(err, &exitErr) {
				exitCode = exitErr.ExitCode()
			} else if ctx.Err() == nil {
				exitCode = 1
			}
		}
		wailsruntime.EventsEmit(a.ctx, "script:exit", scriptExitEvent{
			Code: intPtr(exitCode), Ts: time.Now().UnixMilli(),
		})
	}()
}

func (a *App) StopScript() {
	a.scriptMu.Lock()
	defer a.scriptMu.Unlock()
	if a.scriptCancel != nil {
		a.scriptCancel()
		a.scriptCancel = nil
	}
}

// ─── Utilities ────────────────────────────────────────────────────────────────

func (a *App) GetDataDir() Response[string] {
	return ok(filepath.ToSlash(a.dataDir))
}

func (a *App) OpenOutputFolder(code string) {
	dir := filepath.Join(a.dataDir, "processed_data", code)
	_ = os.MkdirAll(dir, 0755)
	switch runtime.GOOS {
	case "windows":
		exec.Command("explorer", filepath.FromSlash(dir)).Start() //nolint:errcheck
	case "darwin":
		exec.Command("open", dir).Start() //nolint:errcheck
	default:
		exec.Command("xdg-open", dir).Start() //nolint:errcheck
	}
}

func (a *App) CheckScriptsSetup() Response[bool] {
	nmDir := filepath.Join(a.scriptDir, "node_modules")
	if _, err := os.Stat(nmDir); err != nil {
		return ok(false)
	}
	return ok(true)
}

func (a *App) InstallScripts() {
	go func() {
		emit := func(level, text string) {
			wailsruntime.EventsEmit(a.ctx, "script:log", scriptLogEvent{
				Level: level, Text: text, Ts: time.Now().UnixMilli(),
			})
		}

		emit("info", "Installing script dependencies…")

		// Prefer pnpm, fall back to npm
		pm := "npm"
		if _, err := exec.LookPath("pnpm"); err == nil {
			pm = "pnpm"
		}
		if runtime.GOOS == "windows" {
			if _, err := exec.LookPath("pnpm.cmd"); err == nil {
				pm = "pnpm.cmd"
			} else if _, err := exec.LookPath("npm.cmd"); err == nil {
				pm = "npm.cmd"
			}
		}

		cmd := exec.CommandContext(a.ctx, pm, "install")
		cmd.Dir = a.scriptDir
		cmd.Env = append(os.Environ(), "FORCE_COLOR=0")

		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()

		if err := cmd.Start(); err != nil {
			emit("error", fmt.Sprintf("Failed to start package manager: %v", err))
			code := 1
			wailsruntime.EventsEmit(a.ctx, "install:exit", scriptExitEvent{Code: &code, Ts: time.Now().UnixMilli()})
			return
		}

		streamLines := func(r io.Reader, level string) {
			scanner := bufio.NewScanner(r)
			for scanner.Scan() {
				if line := scanner.Text(); line != "" {
					emit(level, line)
				}
			}
		}

		var wg sync.WaitGroup
		wg.Add(2)
		go func() { defer wg.Done(); streamLines(stdout, "info") }()
		go func() { defer wg.Done(); streamLines(stderr, "warn") }()
		wg.Wait()

		exitCode := 0
		if err := cmd.Wait(); err != nil {
			var exitErr *exec.ExitError
			if errors.As(err, &exitErr) {
				exitCode = exitErr.ExitCode()
			} else {
				exitCode = 1
			}
		}

		if exitCode == 0 {
			emit("info", "Dependencies installed successfully.")
		}
		wailsruntime.EventsEmit(a.ctx, "install:exit", scriptExitEvent{Code: intPtr(exitCode), Ts: time.Now().UnixMilli()})
	}()
}
