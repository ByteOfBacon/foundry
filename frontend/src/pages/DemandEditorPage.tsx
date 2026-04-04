import { useState, useCallback } from 'react';
import { useConfigStore } from '@/stores/config-store';
import { useDemandStore } from '@/stores/demand-store';
import { DemandMap } from '@/components/demand/DemandMap';
import { PointPanel } from '@/components/demand/PointPanel';
import { PopList } from '@/components/demand/PopList';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

export function DemandEditorPage() {
  const { config } = useConfigStore();
  const {
    placeCode,
    data,
    selectedPointId,
    dirty,
    loading,
    saving,
    load,
    save,
    selectPoint,
    addPoint,
  } = useDemandStore();

  const [addMode, setAddMode] = useState(false);

  const handlePlaceChange = async (code: string) => {
    await load(code);
    setAddMode(false);
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

  const handleSave = async () => {
    await save();
    toast.success('Demand data saved');
  };

  const selectedPoint = data?.points.find((p) => p.id === selectedPointId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r bg-background shrink-0">
        {/* Place selector */}
        <div className="p-3 border-b">
          <Select value={placeCode ?? ''} onValueChange={handlePlaceChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select a city…" />
            </SelectTrigger>
            <SelectContent>
              {config.places.map((p) => (
                <SelectItem key={p.code} value={p.code} className="text-xs">
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Controls */}
        {placeCode && (
          <div className="flex items-center gap-2 p-3 border-b">
            <Button
              variant={addMode ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5 text-xs flex-1"
              onClick={() => setAddMode((m) => !m)}
              disabled={loading}
            >
              <Plus className="size-3.5" />
              {addMode ? 'Click map to place…' : 'Add point'}
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Save
            </Button>
          </div>
        )}

        {/* Detail panels */}
        <div className="flex-1 overflow-hidden">
          {!placeCode ? (
            <p className="text-xs text-muted-foreground p-4">Select a city to begin editing.</p>
          ) : loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <Tabs defaultValue="point" className="flex flex-col h-full">
              <TabsList className="mx-3 mt-2 mb-0 h-8 text-xs">
                <TabsTrigger value="point" className="text-xs flex-1">
                  {selectedPoint ? 'Point' : `Points (${data?.points.length ?? 0})`}
                </TabsTrigger>
                <TabsTrigger value="pops" className="text-xs flex-1">
                  Pops ({data?.pops.length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="point" className="flex-1 overflow-hidden mt-2">
                {selectedPoint ? (
                  <ScrollArea className="h-full">
                    <div className="p-3">
                      <PointPanel point={selectedPoint} />
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Click a point on the map to select it, or use &quot;Add point&quot; to place a new one.
                    </p>
                    {data && data.points.length > 0 && (
                      <ScrollArea className="h-64 mt-3 rounded-md border">
                        <div className="p-2 flex flex-col gap-0.5">
                          {data.points.map((pt) => (
                            <button
                              key={pt.id}
                              className="text-left text-xs px-2 py-1.5 rounded hover:bg-accent/50 font-mono"
                              onClick={() => selectPoint(pt.id)}
                            >
                              {pt.id}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pops" className="flex-1 overflow-hidden mt-2 px-3 pb-3">
                <PopList pops={data?.pops ?? []} points={data?.points ?? []} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        {placeCode && data ? (
          <DemandMap
            points={data.points}
            pops={data.pops}
            selectedPointId={selectedPointId}
            onSelectPoint={selectPoint}
            onAddPoint={handleAddPoint}
            addMode={addMode}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Select a city to load the demand editor
          </div>
        )}
        {addMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
            Click on the map to place a demand point
          </div>
        )}
      </div>
    </div>
  );
}
