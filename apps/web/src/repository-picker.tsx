import { useEffect, useRef, useState } from 'react';
import type { DirectoryListing } from '@junior-mode/backend';
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
    const [selected, setSelected] = useState(-1);
    const [result, setResult] = useState<{
        query: string;
        hidden: boolean;
        listing?: DirectoryListing;
        error?: string;
    } | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const visible = open && !disabled;
    const current =
        result?.query === value && result.hidden === showHidden ? result : null;
    const listing = current?.listing;
    const entries = listing?.entries || [];

    useEffect(() => {
        if (!visible) return;
        let active = true;
        const timer = setTimeout(async () => {
            try {
                if (!backend.browseDirectories) {
                    throw new Error(
                        'Update and restart the desktop app to browse folders. You can still paste an absolute path.',
                    );
                }
                const next = await backend.browseDirectories({
                    path: value,
                    showHidden,
                });
                if (active) {
                    setResult({
                        query: value,
                        hidden: showHidden,
                        listing: next,
                    });
                    setSelected(
                        next.currentPath ? -1 : next.entries.length ? 0 : -1,
                    );
                }
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

    useEffect(() => {
        list.current
            ?.querySelector('[aria-selected="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    function navigate(path: string) {
        onChange(
            path.endsWith(listing?.separator || '/')
                ? path
                : path + (listing?.separator || '/'),
        );
        setSelected(-1);
        input.current?.focus();
        setOpen(true);
    }

    function choose() {
        if (!listing?.currentPath) return;
        onChange(listing.currentPath);
        input.current?.focus();
        setOpen(false);
    }

    return (
        <div
            className="repository-picker"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
            }}
        >
            <label htmlFor="repository-path">Repository</label>
            <div className="repository-input-row">
                <span className="repository-input-icon" aria-hidden="true">
                    ⌕
                </span>
                <input
                    ref={input}
                    id="repository-path"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={visible}
                    aria-controls={visible ? 'repository-folders' : undefined}
                    aria-activedescendant={
                        visible && entries[selected]
                            ? `repository-folder-${selected}`
                            : undefined
                    }
                    aria-describedby="repository-help"
                    placeholder="Type a path or browse folders…"
                    autoComplete="off"
                    spellCheck={false}
                    value={value}
                    disabled={disabled}
                    required
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        onChange(event.target.value);
                        setSelected(-1);
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === 'Escape' && visible) {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpen(false);
                        } else if (
                            event.key === 'ArrowDown' ||
                            event.key === 'ArrowUp'
                        ) {
                            event.preventDefault();
                            setOpen(true);
                            if (entries.length)
                                setSelected((index) =>
                                    event.key === 'ArrowDown'
                                        ? (index + 1) % entries.length
                                        : (index <= 0
                                              ? entries.length
                                              : index) - 1,
                                );
                        } else if (
                            visible &&
                            (event.key === 'Enter' ||
                                (event.key === 'Tab' &&
                                    !event.shiftKey &&
                                    entries[selected]))
                        ) {
                            event.preventDefault();
                            if (entries[selected])
                                navigate(entries[selected].path);
                            else if (event.key === 'Enter') choose();
                        }
                    }}
                />
                <button
                    type="button"
                    className="secondary repository-browse"
                    disabled={disabled}
                    onClick={() => {
                        input.current?.focus();
                        setOpen(true);
                    }}
                >
                    Browse
                </button>
            </div>
            {visible && (
                <div className="repository-popover">
                    <div className="repository-toolbar">
                        <span title={host}>
                            Folders on{' '}
                            {host ||
                                (isDesktop
                                    ? 'your computer'
                                    : 'the preview server')}
                        </span>
                        <button
                            type="button"
                            className="text-button"
                            onClick={() => navigate(listing?.home || '~')}
                        >
                            Home
                        </button>
                        <button
                            type="button"
                            className="text-button"
                            disabled={
                                !listing ||
                                listing.directory === listing.parentPath
                            }
                            onClick={() => {
                                if (listing) navigate(listing.parentPath);
                            }}
                        >
                            ↑ Up
                        </button>
                    </div>
                    {listing && (
                        <div
                            className="repository-location"
                            title={listing.directory}
                        >
                            {listing.directory}
                        </div>
                    )}
                    <div
                        ref={list}
                        id="repository-folders"
                        role="listbox"
                        aria-label="Folders"
                        aria-busy={!current}
                        className="repository-folders"
                    >
                        {entries.map((entry, index) => (
                            <button
                                type="button"
                                role="option"
                                aria-selected={index === selected}
                                id={`repository-folder-${index}`}
                                key={entry.path}
                                tabIndex={-1}
                                className="repository-folder"
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setSelected(index)}
                                onClick={() => navigate(entry.path)}
                            >
                                <svg
                                    aria-hidden="true"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
                                    <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
                                </svg>
                                <span>{entry.name}</span>
                                <span aria-hidden="true">›</span>
                            </button>
                        ))}
                    </div>
                    <div role="status" className="repository-feedback">
                        {!current
                            ? 'Loading folders…'
                            : current.error ||
                              (!entries.length ? 'No matching folders.' : '')}
                        {listing?.truncated &&
                            'More folders available. Keep typing to narrow the list.'}
                    </div>
                    <div className="repository-picker-footer">
                        <label>
                            <input
                                type="checkbox"
                                checked={showHidden}
                                onChange={(event) =>
                                    setShowHidden(event.target.checked)
                                }
                            />{' '}
                            Show hidden
                        </label>
                        <button
                            type="button"
                            disabled={!listing?.currentPath}
                            onClick={choose}
                        >
                            Use this folder
                        </button>
                    </div>
                    <div className="repository-shortcuts">
                        ↑ ↓ navigate · Enter / Tab open · Esc close
                    </div>
                </div>
            )}
            <p id="repository-help" className="hint">
                Type a path or browse folders. Use ~/ to start from home.
            </p>
        </div>
    );
}
