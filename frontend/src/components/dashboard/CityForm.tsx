import { useState } from 'react';
import type { Place } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { BBoxPicker } from './BBoxPicker';

interface CityFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (place: Place) => Promise<void>;
  initial?: Place;
}

const EMPTY: Place = { code: '', name: '', bbox: [0, 0, 0, 0] };

export function CityForm({ open, onClose, onSave, initial }: CityFormProps) {
  const [form, setForm] = useState<Place>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;

  const set = (patch: Partial<Place>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const valid =
    form.code.trim().length > 0 &&
    form.name.trim().length > 0 &&
    (form.bbox[2] - form.bbox[0]) > 0 &&
    (form.bbox[3] - form.bbox[1]) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit city' : 'Add city'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="city-code">Code</Label>
              <Input
                id="city-code"
                placeholder="e.g. CHI"
                value={form.code}
                disabled={isEdit}
                onChange={(e) => set({ code: e.target.value.toUpperCase().slice(0, 6) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="city-name">Name</Label>
              <Input
                id="city-name"
                placeholder="e.g. Chicago"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="city-locale">Locale <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="city-locale"
              placeholder="e.g. en-US"
              value={form.locale ?? ''}
              onChange={(e) => set({ locale: e.target.value || undefined })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Bounding box</Label>
            <BBoxPicker
              value={form.bbox[2] > form.bbox[0] ? form.bbox : null}
              onChange={(bbox) => set({ bbox })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add city'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
