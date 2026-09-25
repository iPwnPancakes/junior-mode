import { useEffect, useRef, useState } from 'react';
import {
    ArrowUp,
    ChevronRight,
    ChevronsUpDown,
    Folder,
    Home,
} from 'lucide-react';
import type { DirectoryListing } from '@junior-mode/backend';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { backend, isDesktop } from './backend';

export function RepositoryPicker({
    value,
    onChange,
    disabled,
    host,
}: {
    value: string;
    onChange: (path: string) => void;
    disabled: boolean;
    host?: string;
}) {
    const [open, setOpen] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    const [selected, setSelected] = useState('');
    const [result, setResult] = useState<{
        query: string;
        hidden: boolean;
        listing?: DirectoryListing;
        error?: string;
    } | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const visible = open && !disabled;
    const current =
        result?.query === value && result.hidden === showHidden ? result : null;
    const listing = current?.listing;

    useEffect(() => {
        if (!visible) return;
        let active = true;
        const timer = setTimeout(async () => {
            try {
                if (!backend.browseDirectories)
                    throw new Error(
                        'Update and restart the desktop app to browse folders.',
                    );
                const next = await backend.browseDirectories({
                    path: value,
                    showHidden,
                });
                if (active)
                    setResult({
                        query: value,
                        hidden: showHidden,
                        listing: next,
                    });
            } catch (error) {
                if (active)
                    setResult({
                        query: value,
                        hidden: showHidden,
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Could not load folders.',
                    });
            }
        }, 120);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [value, showHidden, visible]);

    function navigate(path: string) {
        const separator = listing?.separator || '/';
        onChange(path.endsWith(separator) ? path : path + separator);
        setSelected('');
        input.current?.focus();
    }

    function choose() {
        if (!listing?.currentPath) return;
        onChange(listing.currentPath);
        setOpen(false);
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="repository-path">Repository</Label>
            <Popover open={visible} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="repository-path"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={visible}
                        aria-label="Repository"
                        aria-describedby="repository-help"
                        disabled={disabled}
                        className="h-10 w-full justify-between font-normal"
                    >
                        <Folder className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-left">
                            {value || 'Choose a repository…'}
                        </span>
                        <ChevronsUpDown className="shrink-0 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    collisionPadding={12}
                    className="flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        input.current?.focus();
                    }}
                >
                    <div className="flex shrink-0 items-center gap-1 px-3 py-2">
                        <span
                            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                            title={host}
                        >
                            Folders on{' '}
                            {host ||
                                (isDesktop
                                    ? 'your computer'
                                    : 'the preview server')}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(listing?.home || '~')}
                        >
                            <Home /> Home
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={
                                !listing ||
                                listing.directory === listing.parentPath
                            }
                            onClick={() => {
                                if (listing) navigate(listing.parentPath);
                            }}
                        >
                            <ArrowUp /> Up
                        </Button>
                    </div>
                    <Separator />
                    <Command
                        className="h-auto min-h-0 flex-1"
                        shouldFilter={false}
                        loop
                        value={selected}
                        onValueChange={setSelected}
                    >
                        <CommandInput
                            ref={input}
                            aria-label="Folder path"
                            placeholder="Type a path or browse folders…"
                            value={value}
                            onValueChange={(path) => {
                                onChange(path);
                                setSelected('');
                            }}
                            onKeyDown={(event) => {
                                if (event.nativeEvent.isComposing) return;
                                if (
                                    event.key === 'Tab' &&
                                    !event.shiftKey &&
                                    listing?.entries.some(
                                        (entry) => entry.path === selected,
                                    )
                                ) {
                                    event.preventDefault();
                                    navigate(selected);
                                } else if (
                                    event.key === 'Enter' &&
                                    !selected &&
                                    listing?.currentPath
                                ) {
                                    event.preventDefault();
                                    choose();
                                }
                            }}
                        />
                        {listing && (
                            <div
                                className="truncate px-3 py-2 text-xs text-muted-foreground"
                                title={listing.directory}
                            >
                                {listing.directory}
                            </div>
                        )}
                        <CommandList
                            aria-label="Folders"
                            aria-busy={!current}
                            className="min-h-0 max-h-52 flex-1 p-1"
                        >
                            {listing?.entries.map((entry) => (
                                <CommandItem
                                    key={entry.path}
                                    value={entry.path}
                                    onSelect={() => navigate(entry.path)}
                                    className="py-2"
                                >
                                    <Folder />
                                    <span className="min-w-0 flex-1 truncate">
                                        {entry.name}
                                    </span>
                                    <ChevronRight />
                                </CommandItem>
                            ))}
                        </CommandList>
                        <div
                            role="status"
                            className="px-3 py-2 text-xs text-muted-foreground empty:hidden"
                        >
                            {!current
                                ? 'Loading folders…'
                                : current.error ||
                                  (!listing?.entries.length
                                      ? 'No matching folders.'
                                      : '')}
                            {listing?.truncated &&
                                'More folders available. Keep typing to narrow the list.'}
                        </div>
                    </Command>
                    <Separator />
                    <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="show-hidden-folders"
                                checked={showHidden}
                                onCheckedChange={(checked) =>
                                    setShowHidden(checked === true)
                                }
                            />
                            <Label
                                htmlFor="show-hidden-folders"
                                className="text-xs font-normal"
                            >
                                Show hidden
                            </Label>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!listing?.currentPath}
                            onClick={choose}
                        >
                            Use this folder
                        </Button>
                    </div>
                    <div className="px-3 pb-2 text-[10px] text-muted-foreground">
                        ↑ ↓ navigate · Enter / Tab open · Esc close
                    </div>
                </PopoverContent>
            </Popover>
            <p id="repository-help" className="text-xs text-muted-foreground">
                Type a path or browse folders. Use ~/ to start from home.
            </p>
        </div>
    );
}
