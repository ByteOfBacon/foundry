import { useEffect, useRef } from 'react';
import { useRunStore } from '@/stores/run-store';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVEL_CLASS: Record<string, string> = {
  info: 'text-foreground',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export function LogTerminal() {
  const { logs, clearLogs } = useRunStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full rounded-lg border bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400">Output</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
          onClick={clearLogs}
          disabled={logs.length === 0}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-zinc-600">No output yet. Run a script to see logs.</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={cn('whitespace-pre-wrap break-all', LEVEL_CLASS[log.level] ?? 'text-foreground')}>
              {log.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
