import { create } from 'zustand';
import type { DemandData, DemandPoint, Pop } from '@/lib/types';
import { OpenDemandFileDialog, SaveDemandFileAs } from '@/wailsjs/go/main/App';

interface DemandState {
  data: DemandData | null;
  selectedPointId: string | null;
  dirty: boolean;
  loading: boolean;
  saving: boolean;

  openFile: () => Promise<boolean>;
  saveAs: () => Promise<boolean>;
  loadData: (data: DemandData) => void;
  selectPoint: (id: string | null) => void;
  addPoint: (point: DemandPoint) => void;
  updatePoint: (point: DemandPoint) => void;
  deletePoint: (id: string) => void;
  addPop: (pop: Pop) => void;
  updatePop: (pop: Pop) => void;
  deletePop: (id: string) => void;
}

export const useDemandStore = create<DemandState>((set, get) => ({
  data: null,
  selectedPointId: null,
  dirty: false,
  loading: false,
  saving: false,

  openFile: async () => {
    set({ loading: true });
    try {
      const res = await OpenDemandFileDialog();
      if (res.status === 'cancelled') return false;
      if (res.status === 'error') throw new Error((res as { error?: string }).error ?? 'Unknown error');
      set({ data: res.data, dirty: false, selectedPointId: null });
      return true;
    } finally {
      set({ loading: false });
    }
  },

  saveAs: async () => {
    const { data } = get();
    if (!data) return false;
    set({ saving: true });
    try {
      const res = await SaveDemandFileAs(data);
      if (res.status === 'cancelled') return false;
      if (res.status === 'success') set({ dirty: false });
      return res.status === 'success';
    } finally {
      set({ saving: false });
    }
  },

  loadData: (data) => set({ data, dirty: false, selectedPointId: null }),

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
