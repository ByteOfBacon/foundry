import { useState } from 'react';
import type { Place } from '@/lib/types';
import { useConfigStore } from '@/stores/config-store';
import { Button } from '@/components/ui/button';
import { CityForm } from './CityForm';
import { ScriptCard } from './ScriptCard';
import { LogTerminal } from './LogTerminal';
import { OutputBrowser } from './OutputBrowser';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, MapPin, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const SCRIPTS = [
  { id: 'roads' as const, label: 'Roads', description: 'OSM road network (motorway → residential)' },
  { id: 'runways-taxiways' as const, label: 'Runways & Taxiways', description: 'Airport runways, taxiways, and aprons' },
  { id: 'buildings' as const, label: 'Buildings index', description: 'Spatial grid index of OSM buildings' },
  { id: 'pmtiles' as const, label: 'PMTiles / Ocean depth', description: 'Regional vector tile extract + water layer' },
];

interface CityPanelProps {
  place: Place;
}

export function CityPanel({ place }: CityPanelProps) {
  const { editPlace, deletePlace } = useConfigStore();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${place.name}? This will not delete any generated files.`)) return;
    setDeleting(true);
    try {
      await deletePlace(place.code);
      toast.success(`${place.name} removed`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <ChevronRight
          className={`size-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <MapPin className="size-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{place.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{place.code}</span>
          </div>
          {place.bbox && (
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
              {place.bbox.map((v) => v.toFixed(4)).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          <Separator />
          <div className="p-4 grid gap-4">
            {/* Scripts */}
            <div className="grid gap-2">
              {SCRIPTS.map((s) => (
                <ScriptCard
                  key={s.id}
                  script={s.id}
                  placeCode={place.code}
                  label={s.label}
                  description={s.description}
                />
              ))}
            </div>

            {/* Log terminal */}
            <div className="h-48">
              <LogTerminal />
            </div>

            {/* Output browser */}
            <OutputBrowser placeCode={place.code} />
          </div>
        </>
      )}

      {editing && (
        <CityForm
          open
          onClose={() => setEditing(false)}
          onSave={async (p) => {
            await editPlace(p);
            toast.success('City updated');
          }}
          initial={place}
        />
      )}
    </div>
  );
}
