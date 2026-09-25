import { useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Folder,
    FolderPlus,
    Plus,
    Settings,
} from 'lucide-react';
import type { CodexState, Project } from '@junior-mode/backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProjectSidebar({
    state,
    disabled,
    draftProjectId,
    onNewChat,
    onAddProject,
    onOpenChat,
    onOpenSettings,
}: {
    state: CodexState | null;
    disabled: boolean;
    draftProjectId?: string;
    onNewChat: (project?: Project) => void;
    onAddProject: () => void;
    onOpenChat: (id: string) => void;
    onOpenSettings: () => void;
}) {
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const query = search.trim().toLowerCase();
    const projects = (state?.projects ?? [])
        .map((project) => ({
            ...project,
            chats: (state?.threads ?? []).filter(
                (chat) =>
                    chat.projectId === project.id &&
                    (!query ||
                        `${project.name} ${project.cwd} ${chat.title}`
                            .toLowerCase()
                            .includes(query)),
            ),
        }))
        .filter(
            (project) =>
                !query ||
                project.chats.length ||
                `${project.name} ${project.cwd}`.toLowerCase().includes(query),
        );

    function start(project?: Project) {
        if (project)
            setCollapsed((current) => {
                const next = new Set(current);
                next.delete(project.id);
                return next;
            });
        onNewChat(project);
    }

    return (
        <aside className="chat-sidebar">
            <div className="sidebar-heading">
                <h1>Projects</h1>
                <span className="chat-count">
                    {state?.projects?.length ?? 0}
                </span>
            </div>
            <Button
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={disabled}
                onClick={() => start()}
            >
                <Plus /> New chat
            </Button>
            <Input
                className="chat-search"
                type="search"
                aria-label="Search chats"
                placeholder="Search projects and chats…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            <div className="mt-4 mb-2 flex items-center justify-between px-1">
                <span className="truncate text-muted-foreground text-xs">
                    Your projects
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    data-project-create
                    aria-label="Add project"
                    title="Add project"
                    onClick={onAddProject}
                >
                    <FolderPlus className="size-4" />
                </Button>
            </div>
            <div className="chat-list gap-3 overflow-y-auto">
                {!state?.projects?.length && (
                    <p className="hint">Add a project to start chatting.</p>
                )}
                {query && !projects.length && (
                    <p className="hint">
                        No projects or chats match your search.
                    </p>
                )}
                {projects.map((project) => {
                    const expanded =
                        Boolean(query) || !collapsed.has(project.id);
                    return (
                        <section
                            key={project.id}
                            aria-label={`Project ${project.name}`}
                            className="space-y-1"
                        >
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    className="min-w-0 flex-1 justify-start gap-2 px-2 font-semibold"
                                    title={project.cwd}
                                    aria-expanded={expanded}
                                    onClick={() =>
                                        setCollapsed((current) => {
                                            const next = new Set(current);
                                            if (next.has(project.id))
                                                next.delete(project.id);
                                            else next.add(project.id);
                                            return next;
                                        })
                                    }
                                >
                                    {expanded ? (
                                        <ChevronDown />
                                    ) : (
                                        <ChevronRight />
                                    )}
                                    <Folder className="hidden sm:block" />
                                    <span className="truncate">
                                        {project.name}
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    disabled={disabled}
                                    aria-label={`New chat in ${project.name}`}
                                    title={`New chat in ${project.name}`}
                                    onClick={() => start(project)}
                                >
                                    <Plus />
                                </Button>
                            </div>
                            {expanded && (
                                <div className="ml-4 space-y-1 border-l border-border pl-2">
                                    {draftProjectId === project.id && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                                            disabled={disabled}
                                            aria-current="page"
                                            onClick={() => start(project)}
                                        >
                                            New chat
                                        </Button>
                                    )}
                                    {project.chats.map((chat) => (
                                        <Button
                                            key={chat.id}
                                            variant="ghost"
                                            className="chat-link h-auto w-full flex-col items-start gap-0 whitespace-normal text-left"
                                            aria-current={
                                                !draftProjectId &&
                                                state?.thread?.id === chat.id
                                                    ? 'page'
                                                    : undefined
                                            }
                                            disabled={disabled}
                                            onClick={() => onOpenChat(chat.id)}
                                        >
                                            <strong className="max-w-full">
                                                {chat.title}
                                            </strong>
                                            <span>
                                                {new Date(
                                                    chat.updatedAt,
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </span>
                                        </Button>
                                    ))}
                                    {!project.chats.length &&
                                        draftProjectId !== project.id && (
                                            <p className="px-2 py-2 text-xs text-muted-foreground">
                                                {query
                                                    ? 'No matching chats'
                                                    : 'No chats yet'}
                                            </p>
                                        )}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
            <div className="sidebar-footer">
                <Button
                    variant="ghost"
                    className="mb-3 w-full justify-start"
                    onClick={onOpenSettings}
                >
                    <Settings /> Settings
                </Button>
                <span
                    className={`status ${state?.status === 'ready' ? 'connected' : ''}`}
                >
                    <span className="dot" />
                    {state?.status === 'ready'
                        ? 'Codex connected'
                        : 'Codex offline'}
                </span>
            </div>
        </aside>
    );
}
