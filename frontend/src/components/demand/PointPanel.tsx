import { useState, useEffect } from 'react';
import type { DemandPoint } from '@/lib/types';
import { useDemandStore } from '@/stores/demand-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Save } from 'lucide-react';

interface PointPanelProps {
  point: DemandPoint;
}

export function PointPanel({ point }: PointPanelProps) {
  const { updatePoint, deletePoint } = useDemandStore();
  const [form, setForm] = useState(point);

  // Reset form when selected point changes
  useEffect(() => setForm(point), [point]);

  const set = (patch: Partial<DemandPoint>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => updatePoint(form);

  const handleDelete = () => {
    if (!confirm(`Delete point "${point.id}"?`)) return;
    deletePoint(point.id);
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(point);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm truncate">{point.id}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="any"
              value={form.location[0]}
              onChange={(e) => set({ location: [parseFloat(e.target.value) || 0, form.location[1]] })}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="any"
              value={form.location[1]}
              onChange={(e) => set({ location: [form.location[0], parseFloat(e.target.value) || 0] })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Residents</Label>
            <Input
              type="number"
              min={0}
              value={form.residents}
              onChange={(e) => set({ residents: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Jobs</Label>
            <Input
              type="number"
              min={0}
              value={form.jobs}
              onChange={(e) => set({ jobs: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Connected pops</Label>
        {point.popIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {point.popIds.map((id) => (
              <span key={id} className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">
                {id}
              </span>
            ))}
          </div>
        )}
      </div>

      {dirty && (
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave}>
          <Save className="size-3.5" />
          Save changes
        </Button>
      )}
    </div>
  );
}
