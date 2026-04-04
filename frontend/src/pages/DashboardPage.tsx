import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/config-store';
import { CityPanel } from '@/components/dashboard/CityPanel';
import { CityForm } from '@/components/dashboard/CityForm';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Place } from '@/lib/types';

export function DashboardPage() {
  const { config, nodeStatus, scriptsReady, initialized, initialize, addPlace } = useConfigStore();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-xs shrink-0">
        {/* Node.js status */}
        <div className="flex items-center gap-1.5">
          {nodeStatus?.available ? (
            <CheckCircle2 className="size-3 text-green-500" />
          ) : (
            <AlertTriangle className="size-3 text-yellow-500" />
          )}
          <span className="text-muted-foreground">
            {nodeStatus?.available
              ? `Node.js ${nodeStatus.version}`
              : 'Node.js not found'}
          </span>
        </div>

        <div className="h-3 w-px bg-border" />

        {/* Scripts status */}
        <div className="flex items-center gap-1.5">
          {scriptsReady ? (
            <CheckCircle2 className="size-3 text-green-500" />
          ) : (
            <AlertTriangle className="size-3 text-yellow-500" />
          )}
          <span className="text-muted-foreground">
            {scriptsReady ? 'Scripts ready' : 'Scripts not installed — run npm install in scripts/'}
          </span>
        </div>

        <div className="flex-1" />

        <Button
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-3.5" />
          Add city
        </Button>
      </div>

      {/* City list */}
      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-3">
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
