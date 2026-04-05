import { useState, useCallback, useMemo, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { FolderOpen, Save, Plus, Loader2, FileJson2, MapPin, Home, Briefcase, PanelRight, X, Undo2, Redo2 } from 'lucide-react';
import { SplitSquareHorizontal } from 'lucide-react';
import { useDemandStore } from '@/stores/demand-store';
import { useTheme } from '@/hooks/use-theme';
import { DemandMap } from '@/components/demand/DemandMap';
import { PointPanel } from '@/components/demand/PointPanel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchInput } from '@/components/ui/search-input';

const SIDEBAR_POINT_LIMIT = 500;
const MOBILE_BREAKPOINT = 980;

export function DemandEditorPage() {
  const {
    data,
    selectedPointId,
    dirty,
    loading,
    saving,
    canUndo,
    canRedo,
    openFile,
    saveAs,
    selectPoint,
    addPoint,
    undo,
    redo,
  } = useDemandStore();
  const normalizePops = useDemandStore((s) => s.normalizePops);
  const { isDark } = useTheme();

  const [addMode, setAddMode] = useState(false);
  const [mapMode, setMapMode] = useState<'residential' | 'workplace'>('residential');
  const [query, setQuery] = useState('');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = () => {
      const mobile = media.matches;
      setIsMobileViewport(mobile);
      setSidebarOpen(!mobile);
    };
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddMode(false);
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, undo]);

  const handleOpen = async () => {
    const opened = await openFile();
    if (opened) {
      setAddMode(false);
      toast.success('Demand data loaded');
    }
  };

  const handleSaveAs = async () => {
    const saved = await saveAs();
    if (saved) toast.success('Demand data saved');
  };

  const handleNormalize = () => {
    normalizePops();
    toast.success('Pops normalized to 200-size chunks (plus one remainder per point)');
  };

  const handleAddPoint = useCallback(
    (lng: number, lat: number) => {
      addPoint({
        id: nanoid(8),
        location: [lng, lat],
        jobs: 0,
        residents: 0,
        popIds: [],
      });
      setAddMode(false);
    },
    [addPoint]
  );

  const handleSelectPoint = useCallback(
    (id: string | null) => {
      selectPoint(id);
      if (id && isMobileViewport) setSidebarOpen(true);
    },
    [isMobileViewport, selectPoint]
  );

  const selectedPoint = data?.points.find((p) => p.id === selectedPointId);

  const residentialPoints = useMemo(
    () =>
      (data?.points ?? [])
        .filter((p) => p.residents > 0)
        .sort((a, b) => b.residents - a.residents),
    [data?.points]
  );

  const workplacePoints = useMemo(
    () =>
      (data?.points ?? [])
        .filter((p) => p.jobs > 0)
        .sort((a, b) => b.jobs - a.jobs),
    [data?.points]
  );

  const activePoints = mapMode === 'residential' ? residentialPoints : workplacePoints;
  const filteredActivePoints = useMemo(() => {
    const source = (mapMode === 'residential' ? residentialPoints : workplacePoints).slice(0, SIDEBAR_POINT_LIMIT);
    if (!query.trim()) return source;
    const q = query.toLowerCase();
    return source.filter((p) => p.id.toLowerCase().includes(q));
  }, [mapMode, query, residentialPoints, workplacePoints]);

  const showSidebar = !!data && sidebarOpen;
  const sidebarWidthClass = isMobileViewport ? 'w-[min(22rem,72vw)]' : 'w-[28rem]';

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        {data ? (
          <DemandMap
            points={data.points}
            pops={data.pops}
            selectedPointId={selectedPointId}
            onSelectPoint={handleSelectPoint}
            onAddPoint={handleAddPoint}
            addMode={addMode}
            isDarkMode={isDark}
            viewMode={mapMode}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 bg-background">
            <FileJson2 className="size-12 text-muted-foreground/40" />
            <div className="space-y-1.5 text-center">
              <p className="text-sm font-medium text-foreground">No file open</p>
              <p className="text-xs text-muted-foreground">Open a demand_data.json to start editing</p>
            </div>
            <Button size="sm" className="gap-2" onClick={handleOpen} disabled={loading}>
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FolderOpen className="size-3.5" />}
              Open file…
            </Button>
          </div>
        )}
      </div>

      {addMode && (
        <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xl">
          <MapPin className="size-3.5" />
          Click map to place a point and press Esc to cancel
        </div>
      )}

      <div className="absolute left-2 right-2 top-2 z-20 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:left-3 sm:right-3 sm:top-3">
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-xs" onClick={handleOpen} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FolderOpen className="size-3.5" />}
            Open
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 px-3 text-xs ${dirty ? 'text-amber-600 dark:text-amber-400' : ''}`}
            onClick={handleSaveAs}
            disabled={!data || saving}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {dirty ? 'Save*' : 'Save'}
          </Button>
          {data && (
            <>
              <div className="h-5 w-px bg-border" />
              <Button
                variant={addMode ? 'default' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setAddMode((m) => !m)}
              >
                <Plus className="size-3.5" />
                Add point
              </Button>
              <div className="h-5 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={handleNormalize}
                title="Normalize point pops to 200-size chunks"
              >
                <SplitSquareHorizontal className="size-3.5" />
                Normalize pops
              </Button>
              <div className="h-5 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl/Cmd+Z)"
              >
                <Undo2 className="size-3.5" />
                Undo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z)"
              >
                <Redo2 className="size-3.5" />
                Redo
              </Button>
            </>
          )}
        </div>

        {data && (
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
            <button
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all ${
                mapMode === 'residential' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setMapMode('residential')}
            >
              <Home className="size-3" />
              Residential
            </button>
            <button
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all ${
                mapMode === 'workplace' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setMapMode('workplace')}
            >
              <Briefcase className="size-3" />
              Workplace
            </button>
          </div>
        )}

        {data && (
          <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-lg backdrop-blur-sm sm:flex">
            <span className="tabular-nums font-medium text-foreground">{data.points.length}</span> points
            <span className="text-border">·</span>
            <span className="tabular-nums font-medium text-foreground">{data.pops.length}</span> pops
          </div>
        )}

        {data && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-lg border border-border bg-background/95 px-3 text-xs shadow-lg backdrop-blur-sm"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {showSidebar ? <X className="size-3.5" /> : <PanelRight className="size-3.5" />}
            {showSidebar ? 'Hide panel' : 'Show panel'}
          </Button>
        )}
      </div>

      {data && showSidebar && (
        <div
          className={`absolute bottom-2 right-2 top-14 z-20 flex ${sidebarWidthClass} min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-md sm:bottom-3 sm:right-3 sm:top-16`}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {selectedPoint ? 'Point Config' : mapMode === 'residential' ? 'Residential' : 'Workplace'}
            </span>
            {selectedPoint && (
              <button
                className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => handleSelectPoint(null)}
                title="Close point"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {selectedPoint ? (
              <ScrollArea className="h-full">
                <div className="p-4">
                  <PointPanel point={selectedPoint} />
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 px-3 pb-2 pt-3">
                  <SearchInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClear={() => setQuery('')}
                    placeholder="Search points…"
                  />
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-2 pb-3">
                    {filteredActivePoints.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                        {query.trim()
                          ? 'No points match your search.'
                          : mapMode === 'residential'
                            ? 'No residential points found.'
                            : 'No workplace points found.'}
                      </p>
                    ) : (
                      filteredActivePoints.map((pt) => (
                        <button
                          key={`${mapMode}-${pt.id}`}
                          className={`mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                            mapMode === 'residential'
                              ? pt.id === selectedPointId
                                ? 'border-blue-500/30 bg-blue-500/14 text-blue-700 dark:text-blue-300'
                                : 'border-transparent text-foreground hover:border-blue-500/20 hover:bg-blue-500/10'
                              : pt.id === selectedPointId
                                ? 'border-orange-500/30 bg-orange-500/14 text-orange-700 dark:text-orange-300'
                                : 'border-transparent text-foreground hover:border-orange-500/20 hover:bg-orange-500/10'
                          }`}
                          onClick={() => handleSelectPoint(pt.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-xs">{pt.id}</span>
                            <span
                              className={`shrink-0 text-[11px] font-medium tabular-nums ${
                                mapMode === 'residential' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {mapMode === 'residential' ? pt.residents.toLocaleString() : pt.jobs.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                    {activePoints.length > SIDEBAR_POINT_LIMIT && (
                      <p className="pt-2 text-center text-[10px] text-muted-foreground">
                        Showing top {SIDEBAR_POINT_LIMIT.toLocaleString()}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
