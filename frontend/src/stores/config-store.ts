import { create } from 'zustand';
import type { GeneratorConfig, NodeJSStatus, Place } from '@/lib/types';
import {
  CheckNodeJS,
  CheckScriptsSetup,
  GetConfig,
  SaveConfig,
} from '@/wailsjs/go/main/App';

interface ConfigState {
  config: GeneratorConfig;
  nodeStatus: NodeJSStatus | null;
  scriptsReady: boolean;
  initialized: boolean;
  saving: boolean;

  initialize: () => Promise<void>;
  refreshScriptsReady: () => Promise<void>;
  saveConfig: (config: GeneratorConfig) => Promise<void>;
  addPlace: (place: Place) => Promise<void>;
  editPlace: (place: Place) => Promise<void>;
  deletePlace: (code: string) => Promise<void>;
}

const DEFAULT_CONFIG: GeneratorConfig = { 'tile-zoom-level': 13, places: [] };

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  nodeStatus: null,
  scriptsReady: false,
  initialized: false,
  saving: false,

  initialize: async () => {
    try {
      const [cfgRes, nodeRes, scriptsRes] = await Promise.all([
        GetConfig(),
        CheckNodeJS(),
        CheckScriptsSetup(),
      ]);
      set({
        config: cfgRes.status === 'success' ? cfgRes.data : DEFAULT_CONFIG,
        nodeStatus: nodeRes.status === 'success' ? nodeRes.data : null,
        scriptsReady: scriptsRes.status === 'success' ? scriptsRes.data : false,
        initialized: true,
      });
    } catch {
      // Wails runtime not ready yet — mark initialized anyway to unblock the UI
      set({ initialized: true });
    }
  },

  refreshScriptsReady: async () => {
    try {
      const res = await CheckScriptsSetup();
      if (res.status === 'success') set({ scriptsReady: res.data });
    } catch { /* ignore */ }
  },

  saveConfig: async (config) => {
    set({ saving: true });
    try {
      await SaveConfig(config);
      set({ config });
    } finally {
      set({ saving: false });
    }
  },

  addPlace: async (place) => {
    const { config, saveConfig } = get();
    await saveConfig({ ...config, places: [...config.places, place] });
  },

  editPlace: async (place) => {
    const { config, saveConfig } = get();
    await saveConfig({
      ...config,
      places: config.places.map((p) => (p.code === place.code ? place : p)),
    });
  },

  deletePlace: async (code) => {
    const { config, saveConfig } = get();
    await saveConfig({
      ...config,
      places: config.places.filter((p) => p.code !== code),
    });
  },
}));
