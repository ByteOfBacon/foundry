import type { ScriptId } from '@/lib/types';
import { useRunStore } from '@/stores/run-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ScriptCardProps {
  script: ScriptId;
  placeCode: string;
  label: string;
  description: string;
}

const STATUS_CONFIG = {
  idle: { label: 'Idle', badge: 'secondary' as const, icon: null },
  running: { label: 'Running', badge: 'default' as const, icon: Loader2 },
  success: { label: 'Done', badge: 'success' as const, icon: CheckCircle2 },
  error: { label: 'Failed', badge: 'destructive' as const, icon: XCircle },
};

export function ScriptCard({ script, placeCode, label, description }: ScriptCardProps) {
  const { activeScript, activePlaceCode, statuses, runScript, stopScript } = useRunStore();

  const status = statuses[placeCode]?.[script] ?? 'idle';
  const isRunning = activeScript === script && activePlaceCode === placeCode;
  const otherRunning = !!activeScript && !isRunning;

  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  const handleRun = () => runScript(script, placeCode);
  const handleStop = () => stopScript();

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm">{label}</span>
          <Badge variant={cfg.badge} className="text-[10px] px-1.5 py-0">
            {StatusIcon && (
              <StatusIcon
                className={`size-2.5 mr-1 ${isRunning ? 'animate-spin' : ''}`}
              />
            )}
            {cfg.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>

      {isRunning ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs shrink-0"
          onClick={handleStop}
        >
          <Square className="size-3" />
          Stop
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs shrink-0"
          onClick={handleRun}
          disabled={otherRunning}
        >
          <Play className="size-3" />
          Run
        </Button>
      )}
    </div>
  );
}
