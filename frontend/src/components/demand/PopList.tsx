import type { Pop, DemandPoint } from '@/lib/types';
import { useDemandStore } from '@/stores/demand-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ArrowRight } from 'lucide-react';

interface PopListProps {
  pops: Pop[];
  points: DemandPoint[];
}

export function PopList({ pops, points }: PopListProps) {
  const { deletePop, selectPoint } = useDemandStore();

  const pointName = (id: string) => {
    const p = points.find((pt) => pt.id === id);
    return p ? p.id : id;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Pops ({pops.length})
        </span>
      </div>

      <ScrollArea className="h-full rounded-md border">
        <div className="p-2 flex flex-col gap-1">
          {pops.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No pops defined</p>
          ) : (
            pops.map((pop) => (
              <div
                key={pop.id}
                className="group flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent/50 gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      className="font-mono truncate max-w-[80px] hover:text-primary transition-colors"
                      onClick={() => selectPoint(pop.residenceId)}
                    >
                      {pointName(pop.residenceId)}
                    </button>
                    <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                    <button
                      className="font-mono truncate max-w-[80px] hover:text-primary transition-colors"
                      onClick={() => selectPoint(pop.jobId)}
                    >
                      {pointName(pop.jobId)}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    size {pop.size.toLocaleString()} · {(pop.drivingDistance / 1000).toFixed(1)} km
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deletePop(pop.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
