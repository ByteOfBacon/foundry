import { useEffect, useState } from 'react';
import type { PlaceOutput } from '@/lib/types';
import { ListOutputFiles, OpenOutputFolder } from '@/wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputBrowserProps {
  placeCode: string;
}

export function OutputBrowser({ placeCode }: OutputBrowserProps) {
  const [outputs, setOutputs] = useState<PlaceOutput[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await ListOutputFiles();
    if (res.status === 'success') setOutputs(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [placeCode]);

  const placeOutput = outputs.find((o) => o.code === placeCode);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Output files</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => OpenOutputFolder(placeCode)}
          >
            <FolderOpen className="size-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-36 rounded-md border">
        <div className="p-2">
          {!placeOutput || placeOutput.files.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No output files yet
            </p>
          ) : (
            placeOutput.files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-accent/50 gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono truncate">{file.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                  {file.sizeMb.toFixed(1)} MB
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
