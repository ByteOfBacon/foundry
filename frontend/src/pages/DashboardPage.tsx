import { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '@/stores/config-store';
import { CityPanel } from '@/components/dashboard/CityPanel';
import { CityForm } from '@/components/dashboard/CityForm';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, AlertTriangle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Place } from '@/lib/types';
import { InstallScripts } from '@/wailsjs/go/main/App';
import { EventsOn } from '@/wailsjs/runtime/runtime';

export function DashboardPage() {
  const { config, nodeStatus, scriptsReady, initialized, initialize, refreshScriptsReady } =
    useConfigStore();
  const [addOpen, setAddOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const addPlace = useConfigStore((s) => s.addPlace);

  // Subscribe to install:exit once
  const installedSub = useRef(false);
  useEffect(() => {
    if (installedSub.current) return;
    installedSub.current = true;
    EventsOn('install:exit', (...args: unknown[]) => {
      const event = args[0] as { code: number };
      setInstalling(false);
      if (event.code === 0) {
        refreshScriptsReady();
        toast.success('Script dependencies installed');
      } else {
        toast.error('Installation failed — check the output terminal');
      }
    });
  }, [refreshScriptsReady]);

  // Auto-install if node is available but scripts aren't ready
  useEffect(() => {
    if (!initialized) {
      initialize();
      return;
    }
    if (nodeStatus?.available && !scriptsReady && !installing) {
      setInstalling(true);
      InstallScripts().catch(() => setInstalling(false));
    }
  }, [initialized, nodeStatus?.available, scriptsReady]);

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const nodeOk = nodeStatus?.available ?? false;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Status bar */}
      <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/70 bg-background/90 px-4 py-2.5 text-xs shadow-sm backdrop-blur-md">
        {/* Node.js */}
        <div className="flex items-center gap-1.5">
          {nodeOk ? (
            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="size-3 text-amber-500 shrink-0" />
          )}
          <span className={nodeOk ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'}>
            {nodeOk ? `Node.js ${nodeStatus!.version}` : 'Node.js not found — install from nodejs.org'}
          </span>
        </div>

        <div className="h-3 w-px bg-border shrink-0" />

        {/* Scripts */}
        <div className="flex items-center gap-1.5">
          {installing ? (
            <Loader2 className="size-3 animate-spin text-primary shrink-0" />
          ) : scriptsReady ? (
            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="size-3 text-amber-500 shrink-0" />
          )}
          <span
            className={
              installing
                ? 'text-foreground'
                : scriptsReady
                ? 'text-foreground'
                : 'text-amber-600 dark:text-amber-400'
            }
          >
            {installing
              ? 'Installing dependencies…'
              : scriptsReady
              ? 'Scripts ready'
              : nodeOk
              ? 'Installing dependencies…'
              : 'Scripts not installed (Node.js required)'}
          </span>
          {!scriptsReady && !installing && nodeOk && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] gap-1 ml-1"
              onClick={() => {
                setInstalling(true);
                InstallScripts().catch(() => setInstalling(false));
              }}
            >
              <Download className="size-2.5" />
              Retry
            </Button>
          )}
        </div>

        <div className="flex-1" />

        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" />
          Add city
        </Button>
      </div>

      {/* City list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3">
          {config.places.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <p className="text-sm">No cities configured yet.</p>
              <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" />
                Add your first city
              </Button>
            </div>
          ) : (
            config.places.map((place: Place) => (
              <CityPanel key={place.code} place={place} />
            ))
          )}
        </div>
      </ScrollArea>

      {addOpen && (
        <CityForm
          open
          onClose={() => setAddOpen(false)}
          onSave={async (place) => {
            await addPlace(place);
            toast.success(`${place.name} added`);
          }}
        />
      )}
    </div>
  );
}
