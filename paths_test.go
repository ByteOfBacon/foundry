package main

import (
	"path/filepath"
	"testing"
)

func TestResolveDataDirUsesOverride(t *testing.T) {
	t.Setenv("FOUNDRY_DATA_DIR", "./tmp-foundry")

	got := resolveDataDir()
	want := filepath.Clean("./tmp-foundry")
	if got != want {
		t.Fatalf("resolveDataDir() = %q, want %q", got, want)
	}
}

func TestResolveDataDirDefaultNotEmpty(t *testing.T) {
	t.Setenv("FOUNDRY_DATA_DIR", "")

	got := resolveDataDir()
	if got == "" {
		t.Fatal("resolveDataDir() returned empty path")
	}
}
