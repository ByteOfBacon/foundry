import { useState, useCallback } from 'react';
import { useDemandStore } from '@/stores/demand-store';
import { DemandMap } from '@/components/demand/DemandMap';
import { PointPanel } from '@/components/demand/PointPanel';
import { PopList } from '@/components/demand/PopList';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Save, Plus, Loader2, FileJson2 } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

export function DemandEditorPage() {
  const {
    data,
    selectedPointId,
    dirty,
    loading,
    saving,
    openFile,
    saveAs,
    selectPoint,
    addPoint,
  } = useDemandStore();

  const [addMode, setAddMode] = useState(false);

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

  const selectedPoint = data?.points.find((p) => p.id === selectedPointId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r bg-background shrink-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs flex-1"
            onClick={handleOpen}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FolderOpen className="size-3.5" />
            )}
            Open file…
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleSaveAs}
            disabled={!data || saving}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {dirty ? 'Save as… *' : 'Save as…'}
          </Button>
        </div>

        {/* Add point button — only shown when file is open */}
        {data && (
          <div className="px-3 pt-2 pb-1">
            <Button
              variant={addMode ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5 text-xs w-full"
              onClick={() => setAddMode((m) => !m)}
            >
              <Plus className="size-3.5" />
              {addMode ? 'Click map to place…' : 'Add point'}
            </Button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {!data ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <FileJson2 className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Open a <code className="text-xs bg-muted px-1 py-0.5 rounded">demand_data.json</code> file to start editing.
              </p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleOpen}>
                <FolderOpen className="size-3.5" />
                Open file…
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="points" className="flex flex-col h-full">
              <TabsList className="mx-3 mt-2 mb-0 h-8">
                <TabsTrigger value="points" className="text-xs flex-1">
                  {selectedPoint ? 'Point' : `Points (${data.points.length})`}
                </TabsTrigger>
                <TabsTrigger value="pops" className="text-xs flex-1">
                  Pops ({data.pops.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="points" className="flex-1 overflow-hidden mt-2">
                {selectedPoint ? (
                  <ScrollArea className="h-full">
                    <div className="p-3">
                      <PointPanel point={selectedPoint} />
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-3 flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      Click a point on the map to select it, or use &quot;Add point&quot; to place a new one.
                    </p>
                    {data.points.length > 0 && (
                      <ScrollArea className="h-64 rounded-md border">
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
                <PopList pops={data.pops} points={data.points} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        {data ? (
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
            Open a demand data file to view the map
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
