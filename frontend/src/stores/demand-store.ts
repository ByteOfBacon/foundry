import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { DemandData, DemandPoint, Pop } from '@/lib/types';
import { OpenDemandFileDialog, SaveDemandFileAs } from '@/wailsjs/go/main/App';

const MAX_POP_SIZE = 200;

function normalizeChunkSizes(total: number, chunkSize = MAX_POP_SIZE): number[] {
  if (total <= 0) return [];
  const fullChunks = Math.floor(total / chunkSize);
  const remainder = total % chunkSize;
  const chunks = Array(fullChunks).fill(chunkSize) as number[];
  if (remainder > 0) chunks.push(remainder);
  return chunks;
}

function rebuildPointPopIds(points: DemandPoint[], pops: Pop[]): DemandPoint[] {
  const byPoint = new Map<string, string[]>();
  const residentCounts = new Map<string, number>();
  const jobCounts = new Map<string, number>();
  for (const point of points) byPoint.set(point.id, []);

  for (const pop of pops) {
    const riders = Math.max(0, Math.round(Number(pop.size) || 0));
    const residence = byPoint.get(pop.residenceId);
    if (residence) residence.push(pop.id);
    const job = byPoint.get(pop.jobId);
    if (job && pop.jobId !== pop.residenceId) job.push(pop.id);
    residentCounts.set(pop.residenceId, (residentCounts.get(pop.residenceId) ?? 0) + riders);
    jobCounts.set(pop.jobId, (jobCounts.get(pop.jobId) ?? 0) + riders);
  }

  return points.map((point) => ({
    ...point,
    popIds: byPoint.get(point.id) ?? [],
    residents: residentCounts.get(point.id) ?? 0,
    jobs: jobCounts.get(point.id) ?? 0,
  }));
}

function normalizePopsByResidence(data: DemandData): DemandData {
  const nextPops: Pop[] = [];
  for (const pop of data.pops) {
    const size = Math.max(0, Math.round(Number(pop.size) || 0));
    const chunks = normalizeChunkSizes(size);
    for (let i = 0; i < chunks.length; i++) {
      nextPops.push({
        ...pop,
        id: i === 0 ? pop.id : nanoid(8),
        size: chunks[i],
      });
    }
  }
  const nextPoints = rebuildPointPopIds(data.points, nextPops);
  return { ...data, pops: nextPops, points: nextPoints };
}

interface DemandState {
  data: DemandData | null;
  selectedPointId: string | null;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  _baseline: Snapshot | null;
  _history: HistoryState;

  openFile: () => Promise<boolean>;
  saveAs: () => Promise<boolean>;
  loadData: (data: DemandData) => void;
  selectPoint: (id: string | null) => void;
  addPoint: (point: DemandPoint) => void;
  updatePoint: (currentId: string, point: DemandPoint) => void;
  deletePoint: (id: string) => void;
  addPop: (pop: Pop) => void;
  updatePop: (pop: Pop) => void;
  deletePop: (id: string) => void;
  normalizePops: () => void;
  undo: () => void;
  redo: () => void;
}

type Snapshot = {
  data: DemandData;
  selectedPointId: string | null;
};

type HistoryState = {
  past: Snapshot[];
  future: Snapshot[];
};

const deepCopyData = (data: DemandData): DemandData => ({
  points: data.points.map((p) => ({ ...p, location: [...p.location] as [number, number], popIds: [...p.popIds] })),
  pops: data.pops.map((p) => ({ ...p })),
});
const rebuildData = (data: DemandData): DemandData => ({
  ...data,
  points: rebuildPointPopIds(data.points, data.pops),
});

const snapshotFrom = (data: DemandData, selectedPointId: string | null): Snapshot => ({
  data: deepCopyData(data),
  selectedPointId,
});

const emptyHistory = (): HistoryState => ({ past: [], future: [] });

export const useDemandStore = create<DemandState>((set, get) => ({
  data: null,
  selectedPointId: null,
  dirty: false,
  loading: false,
  saving: false,
  canUndo: false,
  canRedo: false,

  openFile: async () => {
    set({ loading: true });
    try {
      const res = await OpenDemandFileDialog();
      if (res.status === 'cancelled') return false;
      if (res.status === 'error') throw new Error((res as { error?: string }).error ?? 'Unknown error');
      const data = rebuildData(deepCopyData(res.data));
      set({
        data,
        dirty: false,
        selectedPointId: null,
        canUndo: false,
        canRedo: false,
        _baseline: snapshotFrom(data, null),
        _history: emptyHistory(),
      } as DemandStateInternalPatch);
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
      if (res.status === 'success') {
        set((s) => {
          if (!s.data) return s;
          return {
            dirty: false,
            _baseline: snapshotFrom(s.data, s.selectedPointId),
            _history: emptyHistory(),
            canUndo: false,
            canRedo: false,
          } as DemandStateInternalPatch;
        });
      }
      return res.status === 'success';
    } finally {
      set({ saving: false });
    }
  },

  loadData: (data) => {
    const copied = rebuildData(deepCopyData(data));
    set({
      data: copied,
      dirty: false,
      selectedPointId: null,
      canUndo: false,
      canRedo: false,
      _baseline: snapshotFrom(copied, null),
      _history: emptyHistory(),
    } as DemandStateInternalPatch);
  },

  selectPoint: (id) => set({ selectedPointId: id }),

  addPoint: (point) =>
    set((s) => mutateWithHistory(s, (data) => ({ ...data, points: rebuildPointPopIds([...data.points, point], data.pops) }))),

  updatePoint: (currentId, point) =>
    set((s) =>
      mutateWithHistory(
        s,
        (data) => {
          const points = data.points.map((p) => (p.id === currentId ? point : p));
          const pops = data.pops.map((pop) => ({
            ...pop,
            residenceId: pop.residenceId === currentId ? point.id : pop.residenceId,
            jobId: pop.jobId === currentId ? point.id : pop.jobId,
          }));
          return { ...data, points: rebuildPointPopIds(points, pops), pops };
        },
        (selectedPointId) => (selectedPointId === currentId ? point.id : selectedPointId)
      )
    ),

  deletePoint: (id) =>
    set((s) =>
      mutateWithHistory(
        s,
        (data) => {
          const points = data.points.filter((p) => p.id !== id);
          const pops = data.pops.filter((pop) => pop.residenceId !== id && pop.jobId !== id);
          return { ...data, points: rebuildPointPopIds(points, pops), pops };
        },
        (selectedPointId) => (selectedPointId === id ? null : selectedPointId)
      )
    ),

  addPop: (pop) =>
    set((s) =>
      mutateWithHistory(s, (data) => {
        const pops = [...data.pops, pop];
        return { ...data, points: rebuildPointPopIds(data.points, pops), pops };
      })
    ),

  updatePop: (pop) =>
    set((s) =>
      mutateWithHistory(s, (data) => {
        const pops = data.pops.map((p) => (p.id === pop.id ? pop : p));
        return { ...data, points: rebuildPointPopIds(data.points, pops), pops };
      })
    ),

  deletePop: (id) =>
    set((s) =>
      mutateWithHistory(s, (data) => {
        const pops = data.pops.filter((p) => p.id !== id);
        return { ...data, points: rebuildPointPopIds(data.points, pops), pops };
      })
    ),

  normalizePops: () =>
    set((s) => mutateWithHistory(s, (data) => normalizePopsByResidence(data))),

  undo: () =>
    set((s) => {
      const history = s._history;
      if (!history || history.past.length === 0 || !s.data) return s;
      const previous = history.past[history.past.length - 1];
      const current = snapshotFrom(s.data, s.selectedPointId);
      const nextHistory: HistoryState = {
        past: history.past.slice(0, -1),
        future: [current, ...history.future],
      };
      const baseline = s._baseline;
      return {
        data: deepCopyData(previous.data),
        selectedPointId: previous.selectedPointId,
        dirty: !baseline || !sameSnapshot(previous, baseline),
        canUndo: nextHistory.past.length > 0,
        canRedo: nextHistory.future.length > 0,
        _history: nextHistory,
      } as DemandStateInternalPatch;
    }),

  redo: () =>
    set((s) => {
      const history = s._history;
      if (!history || history.future.length === 0 || !s.data) return s;
      const [next, ...restFuture] = history.future;
      const current = snapshotFrom(s.data, s.selectedPointId);
      const nextHistory: HistoryState = {
        past: [...history.past, current],
        future: restFuture,
      };
      const baseline = s._baseline;
      return {
        data: deepCopyData(next.data),
        selectedPointId: next.selectedPointId,
        dirty: !baseline || !sameSnapshot(next, baseline),
        canUndo: nextHistory.past.length > 0,
        canRedo: nextHistory.future.length > 0,
        _history: nextHistory,
      } as DemandStateInternalPatch;
    }),

  _baseline: null,
  _history: emptyHistory(),
}));

type DemandStateInternal = DemandState & {
  _baseline: Snapshot | null;
  _history: HistoryState;
};

type DemandStateInternalPatch = Partial<DemandStateInternal>;

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return a.selectedPointId === b.selectedPointId && JSON.stringify(a.data) === JSON.stringify(b.data);
}

function mutateWithHistory(
  state: DemandStateInternal,
  mutateData: (data: DemandData) => DemandData,
  mapSelection?: (selectedPointId: string | null) => string | null
): DemandStateInternalPatch {
  if (!state.data) return state;
  const before = snapshotFrom(state.data, state.selectedPointId);
  const afterData = mutateData(deepCopyData(state.data));
  const afterSelection = mapSelection ? mapSelection(state.selectedPointId) : state.selectedPointId;
  const after = snapshotFrom(afterData, afterSelection);
  if (sameSnapshot(before, after)) return state;

  const nextHistory: HistoryState = {
    past: [...state._history.past, before],
    future: [],
  };

  return {
    data: afterData,
    selectedPointId: afterSelection,
    dirty: !state._baseline || !sameSnapshot(after, state._baseline),
    canUndo: nextHistory.past.length > 0,
    canRedo: false,
    _history: nextHistory,
  };
}
