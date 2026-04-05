import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, placeholder = 'Search…', ...props }, ref) => {
    const hasValue = typeof value === 'string' ? value.length > 0 : false;

    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            'h-8 rounded-md border-border bg-background pl-8 pr-8 text-xs shadow-none focus-visible:ring-1',
            className
          )}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/45 hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
