import { useMemo, useState, useEffect } from 'react';
import type { DemandPoint, Pop } from '@/lib/types';
import { useDemandStore } from '@/stores/demand-store';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface PointPanelProps {
  point: DemandPoint;
  onClose?: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

const inputClass =
  'h-9 border-border/80 bg-background text-sm font-mono focus-visible:ring-1 focus-visible:ring-primary/35';
const cardClass = 'rounded-lg border border-border/70 bg-background/70 p-3';
const buttonBase = 'inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors';
const grayButton = `${buttonBase} h-8 border-slate-500/35 bg-slate-500/12 px-3 text-slate-700 hover:bg-slate-500/20 dark:text-slate-300`;
const greenButton = `${buttonBase} h-8 border-green-500/35 bg-green-500/12 px-3 text-green-700 hover:bg-green-500/20 dark:text-green-300`;
const redButton = `${buttonBase} h-8 border-red-500/35 bg-red-500/12 px-3 text-red-700 hover:bg-red-500/20 dark:text-red-300`;
const dropdownButton = 'flex h-9 w-full items-center gap-2 rounded-md border border-border/80 bg-background px-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/30';

export function PointPanel({ point, onClose }: PointPanelProps) {
  const { data, updatePoint, deletePoint, updatePop, deletePop, addPop } = useDemandStore();
  const [form, setForm] = useState(point);
  const [popTab, setPopTab] = useState<'residents' | 'jobs'>('residents');
  const [editingPopId, setEditingPopId] = useState<string | null>(null);
  const [popForm, setPopForm] = useState<Pop | null>(null);
  const [popIdsCollapsed, setPopIdsCollapsed] = useState(true);
  const [popSearch, setPopSearch] = useState('');
  const [popVisibleCount, setPopVisibleCount] = useState(100);
  const [showAddPopForm, setShowAddPopForm] = useState(false);
  const [newPop, setNewPop] = useState<Pop>({
    id: '',
    residenceId: point.id,
    jobId: point.id,
    size: 0,
    drivingDistance: 0,
    drivingSeconds: 0,
  });

  useEffect(() => setForm(point), [point]);

  useEffect(() => {
    setPopTab('residents');
    setEditingPopId(null);
    setPopForm(null);
    setPopIdsCollapsed(true);
    setPopSearch('');
    setPopVisibleCount(100);
    setShowAddPopForm(false);
    setNewPop({
      id: '',
      residenceId: point.id,
      jobId: point.id,
      size: 0,
      drivingDistance: 0,
      drivingSeconds: 0,
    });
  }, [point.id]);

  const patch = (p: Partial<DemandPoint>) => setForm((f) => ({ ...f, ...p }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(point);
  const pointIds = useMemo(() => (data?.points ?? []).map((p) => p.id), [data?.points]);

  const derivedResidents = useMemo(
    () => (data?.pops ?? []).filter((pop) => pop.residenceId === point.id).reduce((sum, pop) => sum + Math.max(0, Math.floor(pop.size)), 0),
    [data?.pops, point.id]
  );
  const derivedJobs = useMemo(
    () => (data?.pops ?? []).filter((pop) => pop.jobId === point.id).reduce((sum, pop) => sum + Math.max(0, Math.floor(pop.size)), 0),
    [data?.pops, point.id]
  );

  const popById = useMemo(() => {
    const map = new Map<string, Pop>();
    for (const pop of data?.pops ?? []) map.set(pop.id, pop);
    return map;
  }, [data?.pops]);

  const residentPopIds = useMemo(
    () => point.popIds.filter((id) => popById.get(id)?.residenceId === point.id),
    [point.popIds, popById, point.id]
  );
  const jobPopIds = useMemo(
    () => point.popIds.filter((id) => popById.get(id)?.jobId === point.id),
    [point.popIds, popById, point.id]
  );

  const filteredPopIds = useMemo(() => {
    const source = popTab === 'residents' ? residentPopIds : jobPopIds;
    if (!popSearch.trim()) return source;
    const q = popSearch.toLowerCase();
    return source.filter((id) => id.toLowerCase().includes(q));
  }, [jobPopIds, popSearch, popTab, residentPopIds]);

  const visiblePopIds = filteredPopIds.slice(0, popVisibleCount);

  const handleSave = () => {
    const trimmedId = form.id.trim();
    if (!trimmedId) {
      alert('Point ID cannot be empty.');
      return;
    }
    const duplicate = (data?.points ?? []).some((p) => p.id === trimmedId && p.id !== point.id);
    if (duplicate) {
      alert(`A point named "${trimmedId}" already exists.`);
      return;
    }

    updatePoint(point.id, {
      ...form,
      id: trimmedId,
      residents: derivedResidents,
      jobs: derivedJobs,
      popIds: point.popIds,
    });
  };

  const handleDeletePoint = () => {
    if (!confirm(`Delete point "${point.id}"?`)) return;
    deletePoint(point.id);
  };

  const openPopEditor = (pop: Pop) => {
    if (editingPopId === pop.id) {
      setEditingPopId(null);
      setPopForm(null);
      return;
    }
    setEditingPopId(pop.id);
    setPopForm({ ...pop });
  };

  const savePopChanges = () => {
    if (!popForm) return;
    const residenceId = popForm.residenceId.trim();
    const jobId = popForm.jobId.trim();
    if (!residenceId || !jobId) {
      alert('Residence and job point IDs are required.');
      return;
    }
    if (!pointIds.includes(residenceId) || !pointIds.includes(jobId)) {
      alert('Residence and job IDs must match existing points.');
      return;
    }
    updatePop({
      ...popForm,
      residenceId,
      jobId,
      size: Math.max(0, Math.floor(popForm.size)),
      drivingDistance: Math.max(0, popForm.drivingDistance),
      drivingSeconds: Math.max(0, popForm.drivingSeconds),
    });
    setEditingPopId(null);
    setPopForm(null);
  };

  const resetNewPopForTab = (tab: 'residents' | 'jobs') => {
    setNewPop({
      id: '',
      residenceId: tab === 'residents' ? point.id : '',
      jobId: tab === 'jobs' ? point.id : '',
      size: 0,
      drivingDistance: 0,
      drivingSeconds: 0,
    });
  };

  const switchPopTab = (tab: 'residents' | 'jobs') => {
    setPopTab(tab);
    setPopSearch('');
    setPopVisibleCount(100);
    setEditingPopId(null);
    setPopForm(null);
    setShowAddPopForm(false);
    resetNewPopForTab(tab);
  };

  const handleAddPop = () => {
    const residenceId = newPop.residenceId.trim();
    const jobId = newPop.jobId.trim();
    if (!residenceId || !jobId) {
      alert('Residence and job point IDs are required.');
      return;
    }
    if (!pointIds.includes(residenceId) || !pointIds.includes(jobId)) {
      alert('Residence and job IDs must match existing points.');
      return;
    }
    if (newPop.size <= 0) {
      alert('Riders must be greater than 0.');
      return;
    }

    addPop({
      ...newPop,
      id: `pop_${Date.now().toString(36)}`,
      size: Math.floor(newPop.size),
      drivingDistance: Math.max(0, newPop.drivingDistance),
      drivingSeconds: Math.max(0, newPop.drivingSeconds),
    });

    setShowAddPopForm(false);
    resetNewPopForTab(popTab);
  };

  const tabClass = (tab: 'residents' | 'jobs') => {
    const active = popTab === tab;
    if (tab === 'residents') {
      return active
        ? 'border-blue-500/40 bg-blue-500/14 text-blue-700 dark:text-blue-300'
        : 'border-blue-500/20 bg-blue-500/6 text-blue-700/75 hover:bg-blue-500/14 dark:text-blue-300/80';
    }
    return active
      ? 'border-orange-500/40 bg-orange-500/14 text-orange-700 dark:text-orange-300'
      : 'border-orange-500/20 bg-orange-500/6 text-orange-700/75 hover:bg-orange-500/14 dark:text-orange-300/80';
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <header className="space-y-1 border-b border-border/70 pb-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Point Configuration</h2>
        <p className="text-xs text-muted-foreground">Edit point metadata and manage pop connections cleanly by tab.</p>
      </header>

      <section className={`${cardClass} space-y-4`}>
        <p className="mb-3 text-sm font-semibold text-primary">Point Fields</p>
        <div className="space-y-4">
          <label className="space-y-1">
            <FieldLabel>ID</FieldLabel>
            <Input
              value={form.id}
              onChange={(e) => patch({ id: e.target.value })}
              className={inputClass}
              placeholder="downtown-hub"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <FieldLabel>Residents Count</FieldLabel>
              <p className="text-xl font-bold leading-none text-blue-600 dark:text-blue-400">{derivedResidents.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <FieldLabel>Jobs Count</FieldLabel>
              <p className="text-xl font-bold leading-none text-orange-600 dark:text-orange-400">{derivedJobs.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel>Location (Coordinates)</FieldLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="number"
                step="any"
                value={form.location[0]}
                onChange={(e) => patch({ location: [parseFloat(e.target.value) || 0, form.location[1]] })}
                className={inputClass}
                placeholder="Longitude"
              />
              <Input
                type="number"
                step="any"
                value={form.location[1]}
                onChange={(e) => patch({ location: [form.location[0], parseFloat(e.target.value) || 0] })}
                className={inputClass}
                placeholder="Latitude"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardClass} space-y-3`}>
        <div className="space-y-1">
          <FieldLabel>popIds</FieldLabel>
          <button
            type="button"
            onClick={() => setPopIdsCollapsed((v) => !v)}
            className={dropdownButton}
          >
            {popIdsCollapsed ? (
              <ChevronRight className="size-4 shrink-0" />
            ) : (
              <ChevronDown className="size-4 shrink-0" />
            )}
            popIds ({point.popIds.length})
          </button>
        </div>

        {!popIdsCollapsed && (
          <div className="mt-3 w-full rounded-lg border border-border/70 bg-background/70 p-3.5">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pop IDs Editor</p>
              <p className="text-xs text-muted-foreground">Residents are blue. Jobs are orange.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => switchPopTab('residents')} className={`${buttonBase} h-8 ${tabClass('residents')}`}>
                  Residents ({residentPopIds.length})
                </button>
                <button type="button" onClick={() => switchPopTab('jobs')} className={`${buttonBase} h-8 ${tabClass('jobs')}`}>
                  Jobs ({jobPopIds.length})
                </button>
              </div>

              <SearchInput
                value={popSearch}
                onChange={(e) => {
                  setPopSearch(e.target.value);
                  setPopVisibleCount(100);
                }}
                onClear={() => {
                  setPopSearch('');
                  setPopVisibleCount(100);
                }}
                placeholder={`Search ${popTab} pop IDs...`}
                className="h-9 text-xs font-mono"
              />

              {visiblePopIds.length === 0 ? (
                <p className="rounded-md border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                  No {popTab === 'residents' ? 'resident' : 'job'} pops match your search.
                </p>
              ) : (
                <div className="space-y-4">
                  {visiblePopIds.map((popId) => {
                    const pop = popById.get(popId);
                    const isEditing = editingPopId === popId;
                    if (!pop) {
                      return (
                        <div key={popId} className="rounded-md border border-border/70 bg-background px-3 py-2 text-xs font-mono text-amber-600">
                          {popId} (missing pop record)
                        </div>
                      );
                    }

                    return (
                      <div key={popId} className="overflow-hidden rounded-md border border-border/70 bg-background">
                        <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left" onClick={() => openPopEditor(pop)}>
                          {isEditing ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                          <span className="truncate text-xs font-mono text-foreground">{pop.id}</span>
                        </button>

                        {isEditing && popForm && (
                          <div className="space-y-4 border-t border-border/70 px-3 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Pop Editor</p>

                            <label className="space-y-1">
                              <FieldLabel>Residence Point ID</FieldLabel>
                              <Input
                                value={popForm.residenceId}
                                onChange={(e) => setPopForm((f) => (f ? { ...f, residenceId: e.target.value } : f))}
                                className={inputClass}
                                placeholder="Residence point ID"
                              />
                            </label>

                            <label className="space-y-1">
                              <FieldLabel>Job Point ID</FieldLabel>
                              <Input
                                value={popForm.jobId}
                                onChange={(e) => setPopForm((f) => (f ? { ...f, jobId: e.target.value } : f))}
                                className={inputClass}
                                placeholder="Job point ID"
                              />
                            </label>

                            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                              <label className="flex h-full flex-col justify-end gap-1">
                                <FieldLabel>Riders</FieldLabel>
                                <Input
                                  type="number"
                                  value={popForm.size}
                                  onChange={(e) => setPopForm((f) => (f ? { ...f, size: parseFloat(e.target.value) || 0 } : f))}
                                  className={inputClass}
                                />
                              </label>
                              <label className="flex h-full flex-col justify-end gap-1">
                                <FieldLabel>Driving Distance (m)</FieldLabel>
                                <Input
                                  type="number"
                                  value={popForm.drivingDistance}
                                  onChange={(e) => setPopForm((f) => (f ? { ...f, drivingDistance: parseFloat(e.target.value) || 0 } : f))}
                                  className={inputClass}
                                />
                              </label>
                              <label className="flex h-full flex-col justify-end gap-1">
                                <FieldLabel>Driving Time (s)</FieldLabel>
                                <Input
                                  type="number"
                                  value={popForm.drivingSeconds}
                                  onChange={(e) => setPopForm((f) => (f ? { ...f, drivingSeconds: parseFloat(e.target.value) || 0 } : f))}
                                  className={inputClass}
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 pt-1">
                              <button type="button" onClick={savePopChanges} className={greenButton}>
                                Save Pop
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPopId(null);
                                  setPopForm(null);
                                }}
                                className={grayButton}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!confirm(`Delete pop "${pop.id}"?`)) return;
                                  deletePop(pop.id);
                                  setEditingPopId(null);
                                  setPopForm(null);
                                }}
                                className={redButton}
                              >
                                <Trash2 className="size-3.5" />
                                Delete Pop
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredPopIds.length > popVisibleCount && (
                    <button type="button" onClick={() => setPopVisibleCount((v) => v + 100)} className={`${grayButton} w-full`}>
                      Load More
                    </button>
                  )}
                </div>
              )}

              <button type="button" onClick={() => setShowAddPopForm((v) => !v)} className={`${grayButton} mt-2 w-full`}>
                <Plus className="size-3.5" />
                Add Pop
              </button>

              {showAddPopForm && (
                <div className="mt-2 space-y-3 rounded-md border border-border/70 bg-background p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">New Pop</p>

                  <label className="space-y-1">
                    <FieldLabel>Residence Point ID</FieldLabel>
                    <Input
                      value={newPop.residenceId}
                      onChange={(e) => setNewPop((p) => ({ ...p, residenceId: e.target.value }))}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1">
                    <FieldLabel>Job Point ID</FieldLabel>
                    <Input
                      value={newPop.jobId}
                      onChange={(e) => setNewPop((p) => ({ ...p, jobId: e.target.value }))}
                      className={inputClass}
                    />
                  </label>

                  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                    <label className="flex h-full flex-col justify-end gap-1">
                      <FieldLabel>Riders</FieldLabel>
                      <Input
                        type="number"
                        value={newPop.size}
                        onChange={(e) => setNewPop((p) => ({ ...p, size: parseFloat(e.target.value) || 0 }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex h-full flex-col justify-end gap-1">
                      <FieldLabel>Driving Distance (m)</FieldLabel>
                      <Input
                        type="number"
                        value={newPop.drivingDistance}
                        onChange={(e) => setNewPop((p) => ({ ...p, drivingDistance: parseFloat(e.target.value) || 0 }))}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex h-full flex-col justify-end gap-1">
                      <FieldLabel>Driving Time (s)</FieldLabel>
                      <Input
                        type="number"
                        value={newPop.drivingSeconds}
                        onChange={(e) => setNewPop((p) => ({ ...p, drivingSeconds: parseFloat(e.target.value) || 0 }))}
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button type="button" onClick={handleAddPop} className={greenButton}>
                      Save Pop
                    </button>
                    <button type="button" onClick={() => setShowAddPopForm(false)} className={grayButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-2.5">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={`${greenButton} disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-green-500/12`}
        >
          Save Point Changes
        </button>
        <button onClick={onClose} className={grayButton}>
          Close
        </button>
        <button onClick={handleDeletePoint} className={redButton}>
          Delete Point
        </button>
      </div>
    </div>
  );
}
