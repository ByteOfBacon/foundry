import { create } from 'zustand';
import type { ScriptId, LogEvent } from '@/lib/types';
import { EventsOn } from '@/wailsjs/runtime/runtime';
import { RunScript, StopScript } from '@/wailsjs/go/main/App';

type ScriptStatus = 'idle' | 'running' | 'success' | 'error';

interface RunState {
  activeScript: ScriptId | null;
  activePlaceCode: string | null;
  statuses: Record<string, Record<ScriptId, ScriptStatus>>;
  logs: LogEvent[];

  runScript: (script: ScriptId, placeCode: string) => Promise<void>;
  stopScript: () => Promise<void>;
  clearLogs: () => void;
}

export const useRunStore = create<RunState>((set, get) => {
  function subscribeToEvents() {
    EventsOn('script:log', (...args: unknown[]) => {
      const event = args[0] as LogEvent;
      set((s) => ({ logs: [...s.logs, event] }));
    });

    EventsOn('script:exit', (...args: unknown[]) => {
      const event = args[0] as { code: number };
      const { activeScript, activePlaceCode } = get();
      if (!activeScript || !activePlaceCode) return;

      const succeeded = event.code === 0;
      set((s) => ({
        activeScript: null,
        activePlaceCode: null,
        statuses: {
          ...s.statuses,
          [activePlaceCode]: {
            ...(s.statuses[activePlaceCode] ?? {}),
            [activeScript]: succeeded ? 'success' : 'error',
          },
        },
      }));
    });
  }

  subscribeToEvents();

  return {
    activeScript: null,
    activePlaceCode: null,
    statuses: {},
    logs: [],

    runScript: async (script, placeCode) => {
      if (get().activeScript) return;
      set((s) => ({
        activeScript: script,
        activePlaceCode: placeCode,
        logs: [],
        statuses: {
          ...s.statuses,
          [placeCode]: {
            ...(s.statuses[placeCode] ?? {}),
            [script]: 'running',
          },
        },
      }));
      await RunScript(script, placeCode);
    },

    stopScript: async () => {
      await StopScript();
    },

    clearLogs: () => set({ logs: [] }),
  };
});
