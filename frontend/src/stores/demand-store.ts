import { create } from 'zustand';
import type { DemandData, DemandPoint, Pop } from '@/lib/types';
import { ReadDemandData, WriteDemandData } from '@/wailsjs/go/main/App';

interface DemandState {
  placeCode: string | null;
  data: DemandData | null;
  selectedPointId: string | null;
  dirty: boolean;
  loading: boolean;
  saving: boolean;

  load: (code: string) => Promise<void>;
  save: () => Promise<void>;
  selectPoint: (id: string | null) => void;
  addPoint: (point: DemandPoint) => void;
  updatePoint: (point: DemandPoint) => void;
  deletePoint: (id: string) => void;
  addPop: (pop: Pop) => void;
  updatePop: (pop: Pop) => void;
  deletePop: (id: string) => void;
}

export const useDemandStore = create<DemandState>((set, get) => ({
  placeCode: null,
  data: null,
  selectedPointId: null,
  dirty: false,
  loading: false,
  saving: false,

  load: async (code) => {
    set({ loading: true, placeCode: code, selectedPointId: null });
    const res = await ReadDemandData(code);
    set({
      data: res.status === 'success' ? res.data : { points: [], pops: [] },
      dirty: false,
      loading: false,
    });
  },

  save: async () => {
    const { placeCode, data } = get();
    if (!placeCode || !data) return;
    set({ saving: true });
    try {
      await WriteDemandData(placeCode, data);
      set({ dirty: false });
    } finally {
      set({ saving: false });
    }
  },

  selectPoint: (id) => set({ selectedPointId: id }),

  addPoint: (point) =>
    set((s) => ({
      data: s.data ? { ...s.data, points: [...s.data.points, point] } : s.data,
      dirty: true,
    })),

  updatePoint: (point) =>
    set((s) => ({
      data: s.data
        ? { ...s.data, points: s.data.points.map((p) => (p.id === point.id ? point : p)) }
        : s.data,
      dirty: true,
    })),

  deletePoint: (id) =>
    set((s) => ({
      data: s.data
        ? {
            points: s.data.points.filter((p) => p.id !== id),
            pops: s.data.pops.filter((p) => p.residenceId !== id && p.jobId !== id),
          }
        : s.data,
      selectedPointId: s.selectedPointId === id ? null : s.selectedPointId,
      dirty: true,
    })),

  addPop: (pop) =>
    set((s) => ({
      data: s.data ? { ...s.data, pops: [...s.data.pops, pop] } : s.data,
      dirty: true,
    })),

  updatePop: (pop) =>
    set((s) => ({
      data: s.data
        ? { ...s.data, pops: s.data.pops.map((p) => (p.id === pop.id ? pop : p)) }
        : s.data,
      dirty: true,
    })),

  deletePop: (id) =>
    set((s) => ({
      data: s.data
        ? { ...s.data, pops: s.data.pops.filter((p) => p.id !== id) }
        : s.data,
      dirty: true,
    })),
}));
