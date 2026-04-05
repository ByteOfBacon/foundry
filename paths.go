package main

import (
	"os"
	"path/filepath"
)

const foundryDataDirName = "foundry"

func resolveDataDir() string {
	if override := os.Getenv("FOUNDRY_DATA_DIR"); override != "" {
		return filepath.Clean(override)
	}

	if configDir, err := os.UserConfigDir(); err == nil {
		return filepath.Join(configDir, foundryDataDirName)
	}

	if homeDir, err := os.UserHomeDir(); err == nil {
		return filepath.Join(homeDir, ".config", foundryDataDirName)
	}

	if cwd, err := os.Getwd(); err == nil {
		return cwd
	}

	return "."
}
