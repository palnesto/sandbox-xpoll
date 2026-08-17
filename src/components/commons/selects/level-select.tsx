// src/components/levels/LevelSelect.tsx
import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Level, LEVELS } from "@/config/levelConfig";

type LevelSelectProps = {
  value: number; // selected level id
  onChange: (id: number, level: Level) => void;
  levels?: Level[];
  includeHidden?: boolean;
  disabled?: boolean;
  className?: string;
};

export function LevelSelect({
  value,
  onChange,
  levels = LEVELS,
  includeHidden = false,
  disabled,
  className,
}: LevelSelectProps) {
  const [open, setOpen] = React.useState(false);

  const items = React.useMemo(() => {
    const list = includeHidden ? levels : levels.filter((l) => !l.isHidden);
    // if duplicate ids exist, keep first occurrence
    const seen = new Set<number>();
    return list.filter((l) =>
      seen.has(l.id) ? false : (seen.add(l.id), true),
    );
  }, [levels, includeHidden]);

  const selected = React.useMemo(() => {
    return items.find((l) => l.id === value) ?? items[0];
  }, [items, value]);

  if (!selected) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 rounded-full px-3 gap-2 shadow-sm",
            "bg-background hover:bg-muted/50",
            "border border-border",
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              <img
                src={selected.image}
                alt={selected.title}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </span>
            <span className="text-sm font-medium">Level {selected.id}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[260px] p-1">
        <Command>
          <CommandList>
            <CommandEmpty>No levels found.</CommandEmpty>
            <CommandGroup heading="Levels">
              {items.map((lvl) => {
                const isActive = lvl.id === selected.id;
                return (
                  <CommandItem
                    key={lvl.id}
                    value={`${lvl.id}-${lvl.title}`}
                    onSelect={() => {
                      onChange(lvl.id, lvl);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                      <img
                        src={lvl.image}
                        alt={lvl.title}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </span>

                    <span className="flex flex-col">
                      <span className="text-sm font-medium">
                        Level {lvl.id} · {lvl.title}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {lvl.points}+ pts
                      </span>
                    </span>

                    {isActive ? (
                      <Check className="ml-auto h-4 w-4 opacity-80" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
