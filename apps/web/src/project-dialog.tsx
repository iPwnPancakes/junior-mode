import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronRight, Folder, Home } from 'lucide-react';
import type {
    DirectoryListing,
    Project,
    CodexState,
} from '@junior-mode/backend';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { backend, isDesktop } from './backend';

export function ProjectDialog({
    open,
    onOpenChange,
    host,
    onAdded,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    host?: string;
    onAdded: (state: CodexState, project: Project) => void;
}) {
    const [path, setPath] = useState('~/');
    const [hidden, setHidden] = useState(false);
    const [selected, setSelected] = useState('');
    const [result, setResult] = useState<{
        path: string;
        hidden: boolean;
        listing?: DirectoryListing;
        error?: string;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const current =
        result?.path === path && result.hidden === hidden ? result : null;
    const listing = current?.listing;
    const leaf = path
        .replace(/[\\/]+$/, '')
        .split(/[\\/]/)
        .pop();
    const create = Boolean(
        listing &&
        !listing.currentPath &&
        leaf &&
        leaf !== '.' &&
        leaf !== '..',
    );
    const target =
        listing?.currentPath ||
        (create && listing
            ? listing.directory +
              (listing.directory.endsWith(listing.separator)
                  ? ''
                  : listing.separator) +
              leaf
            : '');

    useEffect(() => {
        if (!open) return;
        let active = true;
        const timer = setTimeout(async () => {
            try {
                if (!backend.browseDirectories)
                    throw new Error(
                        'Update the desktop app to browse folders.',
                    );
                const listing = await backend.browseDirectories({
                    path,
                    showHidden: hidden,
                });
                if (active) setResult({ path, hidden, listing });
            } catch (failure) {
                if (active)
                    setResult({
                        path,
                        hidden,
                        error:
                            failure instanceof Error
                                ? failure.message
                                : 'Could not browse folders.',
                    });
            }
        }, 120);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [open, path, hidden]);

    function navigate(value: string) {
        const separator = listing?.separator || '/';
        setPath(value.endsWith(separator) ? value : value + separator);
        setSelected('');
        setError('');
        input.current?.focus();
    }
    async function add() {
        if (!target || busy) return;
        setBusy(true);
        setError('');
        try {
            if (!backend.addProject)
                throw new Error(
                    'Pull the latest desktop version and restart Electron to enable projects.',
                );
            const added = await backend.addProject({
                cwd: target,
                ...(create ? { create: true } : {}),
            });
            onAdded(added.state, added.project);
            onOpenChange(false);
        } catch (failure) {
            setError(
                failure instanceof Error
                    ? failure.message
                    : 'Could not add project.',
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!busy) {
                    setError('');
                    onOpenChange(value);
                }
            }}
        >
            <DialogContent
                className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    document
                        .querySelector<HTMLButtonElement>(
                            '[data-project-create]',
                        )
                        ?.focus();
                }}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    input.current?.focus();
                }}
            >
                <div className="border-b px-4 py-3 pr-10">
                    <DialogTitle className="text-sm">Add project</DialogTitle>
                    <DialogDescription className="mt-1 text-xs">
                        Local folder ·{' '}
                        {host ||
                            (isDesktop ? 'Your computer' : 'Preview server')}
                    </DialogDescription>
                </div>
                <Command
                    shouldFilter={false}
                    loop
                    value={selected}
                    onValueChange={setSelected}
                    className="min-h-0 flex-1"
                >
                    <CommandInput
                        ref={input}
                        aria-label="Project folder path"
                        placeholder="Type a folder path…"
                        value={path}
                        disabled={busy}
                        onValueChange={(value) => {
                            setPath(value);
                            setSelected('');
                            setError('');
                        }}
                        onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing) return;
                            if (
                                event.key === 'Enter' &&
                                (event.ctrlKey || event.metaKey || !selected)
                            ) {
                                event.preventDefault();
                                event.stopPropagation();
                                void add();
                            } else if (
                                event.key === 'Tab' &&
                                !event.shiftKey &&
                                listing?.entries.some(
                                    (entry) => entry.path === selected,
                                )
                            ) {
                                event.preventDefault();
                                navigate(selected);
                            }
                        }}
                    />
                    <div className="flex items-center gap-1 border-b px-3 py-2">
                        <span
                            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                            title={listing?.directory}
                        >
                            {listing?.directory || 'Folders'}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => navigate(listing?.home || '~')}
                        >
                            <Home /> Home
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                                busy ||
                                !listing ||
                                listing.directory === listing.parentPath
                            }
                            onClick={() =>
                                listing && navigate(listing.parentPath)
                            }
                        >
                            <ArrowUp /> Up
                        </Button>
                    </div>
                    <CommandList
                        aria-label="Folders"
                        aria-busy={!current}
                        className="min-h-24 max-h-72 p-1"
                    >
                        {listing?.entries.map((entry) => (
                            <CommandItem
                                key={entry.path}
                                value={entry.path}
                                disabled={busy}
                                onSelect={() => navigate(entry.path)}
                                className="gap-3 px-3 py-2.5"
                            >
                                <Folder />
                                <span className="min-w-0 flex-1 truncate">
                                    {entry.name}
                                </span>
                                <ChevronRight />
                            </CommandItem>
                        ))}
                        <div
                            role="status"
                            className="px-3 py-3 text-xs text-muted-foreground empty:hidden"
                        >
                            {!current
                                ? 'Loading folders…'
                                : current.error ||
                                  (!listing?.entries.length
                                      ? 'No matching folders.'
                                      : '')}
                            {listing?.truncated &&
                                ' Keep typing to narrow the list.'}
                        </div>
                    </CommandList>
                </Command>
                <div className="space-y-3 border-t p-3">
                    {create && (
                        <p className="break-all text-xs text-muted-foreground">
                            A new folder will be created at {target}.
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="project-show-hidden"
                                checked={hidden}
                                disabled={busy}
                                onCheckedChange={(value) =>
                                    setHidden(value === true)
                                }
                            />
                            <Label
                                htmlFor="project-show-hidden"
                                className="text-xs font-normal"
                            >
                                Show hidden
                            </Label>
                        </div>
                        <Button
                            size="sm"
                            disabled={!target || busy}
                            onClick={() => void add()}
                        >
                            {busy
                                ? 'Adding…'
                                : create
                                  ? 'Create & add project'
                                  : 'Add project'}
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        ↑ ↓ Navigate · Enter / Tab Open folder · Ctrl / ⌘ Enter
                        Add · Esc Close
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
