import { useEffect, useState } from 'react';
import {
    ChevronDown,
    CircleCheck,
    Cpu,
    Folder,
    FolderPlus,
    PanelLeft,
    Search,
    Settings,
    SquarePen,
    Undo2,
} from 'lucide-react';
import type { ChatSummary, CodexState, Project } from '@junior-mode/backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

function age(updatedAt: string, now: number) {
    const minutes = Math.max(
        0,
        Math.floor((now - new Date(updatedAt).getTime()) / 60000),
    );
    if (minutes < 1) return 'now';
    if (minutes < 60) return minutes + 'm';
    if (minutes < 1440) return Math.floor(minutes / 60) + 'h';
    return Math.floor(minutes / 1440) + 'd';
}

const settledShelfKey = 'junior-mode:sidebar:settled-expanded';
const isSettled = (chat: ChatSummary) => chat.settledOverride === 'settled';
// Settled chats are history, ordered by when the work wrapped up.
const settledTime = (chat: ChatSummary) => chat.settledAt ?? chat.updatedAt;

export function ProjectSidebar({
    state,
    disabled,
    draftProjectId,
    onNewChat,
    onAddProject,
    onOpenChat,
    onSettleChat,
    onUnsettleChat,
    actionsDisabled,
    onOpenSettings,
    collapsed,
    onToggle,
}: {
    state: CodexState | null;
    disabled: boolean;
    draftProjectId?: string;
    onNewChat: (project?: Project) => void;
    onAddProject: () => void;
    onOpenChat: (id: string) => void;
    onSettleChat: (id: string) => void;
    onUnsettleChat: (id: string) => void;
    actionsDisabled: boolean;
    onOpenSettings: () => void;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const [search, setSearch] = useState('');
    const [projectsOpen, setProjectsOpen] = useState(false);
    const [settledOpen, setSettledOpen] = useState(
        () => localStorage.getItem(settledShelfKey) === 'true',
    );
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);
    const projects = state?.projects ?? [];
    const query = search.trim().toLowerCase();
    const chats = [...(state?.threads ?? [])]
        .filter((chat) => {
            const project = projects.find(
                (entry) => entry.id === chat.projectId,
            );
            return (
                !query ||
                `${project?.name} ${chat.cwd} ${chat.title}`
                    .toLowerCase()
                    .includes(query)
            );
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const activeChats = chats.filter((chat) => !isSettled(chat));
    const settledChats = chats
        .filter(isSettled)
        .sort((a, b) => settledTime(b).localeCompare(settledTime(a)));
    // Search reaches into the shelf so settled chats stay findable.
    const showSettled = settledOpen || Boolean(query);
    function toggleSettled() {
        setSettledOpen((open) => {
            localStorage.setItem(settledShelfKey, String(!open));
            return !open;
        });
    }
    function chatCard(chat: ChatSummary) {
        const project = projects.find((entry) => entry.id === chat.projectId);
        const settled = isSettled(chat);
        const time = settled ? settledTime(chat) : chat.updatedAt;
        const running =
            state?.thread?.id === chat.id && state.thread.status === 'running';
        return (
            <div
                key={chat.id}
                className="sidebar-chat-row"
                data-settled={settled || undefined}
            >
                <Button
                    variant="ghost"
                    className="chat-link sidebar-chat-card h-auto flex-col items-stretch justify-start gap-1 px-2.5 py-2 text-left"
                    aria-current={
                        !draftProjectId && state?.thread?.id === chat.id
                            ? 'page'
                            : undefined
                    }
                    disabled={disabled}
                    onClick={() => onOpenChat(chat.id)}
                    title={chat.cwd}
                >
                    <span className="chat-card-project">
                        <span className="project-monogram">
                            {(project?.name || 'JM').slice(0, 2)}
                        </span>
                        <span>{project?.name || 'Project'}</span>
                        <time
                            dateTime={time}
                            title={settled ? 'Settled' : undefined}
                        >
                            {age(time, now)}
                        </time>
                    </span>
                    <strong>{chat.title}</strong>
                    <span className="chat-card-detail">
                        <Folder />
                        <span>{chat.cwd}</span>
                        <Cpu aria-label="Codex" />
                    </span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="sidebar-chat-action"
                    aria-label={settled ? 'Un-settle chat' : 'Settle chat'}
                    title={
                        running
                            ? 'Stop the current turn before settling'
                            : settled
                              ? 'Un-settle chat'
                              : 'Settle chat'
                    }
                    disabled={actionsDisabled || running}
                    onClick={() =>
                        settled
                            ? onUnsettleChat(chat.id)
                            : onSettleChat(chat.id)
                    }
                >
                    {settled ? <Undo2 /> : <CircleCheck />}
                </Button>
            </div>
        );
    }
    const draftProject = projects.find(
        (project) => project.id === draftProjectId,
    );
    return (
        <aside className="chat-sidebar">
            <div className="sidebar-brand-row">
                <Button
                    variant="ghost"
                    size="icon"
                    className="sidebar-icon"
                    onClick={onToggle}
                    aria-label={
                        collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                    }
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <PanelLeft />
                </Button>
                {!collapsed && (
                    <span className="sidebar-brand">
                        <strong>Junior</strong> Mode
                    </span>
                )}
            </div>
            <div
                className={
                    collapsed
                        ? 'flex flex-col items-center gap-1'
                        : 'sidebar-toolbar'
                }
            >
                {!collapsed && (
                    <div className="sidebar-search">
                        <Search />
                        <Input
                            className="h-8 border-0 bg-transparent px-0 shadow-none"
                            aria-label="Search chats"
                            placeholder="Search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                )}
                <Popover open={projectsOpen} onOpenChange={setProjectsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="sidebar-icon"
                            aria-label="Projects"
                            title="Projects"
                        >
                            <Folder />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-0">
                        <Command>
                            <CommandInput
                                placeholder="Find a project…"
                                aria-label="Find a project"
                            />
                            <CommandList>
                                {projects.map((project) => (
                                    <CommandItem
                                        key={project.id}
                                        value={project.name + ' ' + project.cwd}
                                        disabled={disabled}
                                        onSelect={() => {
                                            onNewChat(project);
                                            setProjectsOpen(false);
                                        }}
                                        aria-label={`New chat in ${project.name}`}
                                    >
                                        <Folder />
                                        <div className="min-w-0">
                                            <div className="truncate">
                                                {project.name}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground group-data-[selected=true]:text-highlighted-foreground">
                                                {project.cwd}
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                                {!projects.length && (
                                    <p className="p-3 text-xs text-muted-foreground">
                                        No projects yet.
                                    </p>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                <Button
                    variant="ghost"
                    size="icon"
                    className="sidebar-icon"
                    disabled={disabled}
                    data-project-create
                    aria-label="Add project"
                    title="Add project"
                    onClick={onAddProject}
                >
                    <FolderPlus />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="sidebar-icon"
                    disabled={disabled}
                    aria-label="New chat"
                    title="New chat"
                    onClick={() => onNewChat()}
                >
                    <SquarePen />
                </Button>
            </div>
            {!collapsed && (
                <div
                    className="chat-list sidebar-chat-cards"
                    aria-label="Chats"
                >
                    {draftProject && !query && (
                        <Button
                            variant="ghost"
                            className="sidebar-chat-card h-auto flex-col items-stretch justify-start gap-1 px-2.5 py-2 text-left"
                            aria-current="page"
                            disabled={disabled}
                            onClick={() => onNewChat(draftProject)}
                        >
                            <span className="chat-card-project">
                                <span className="project-monogram">
                                    {draftProject.name.slice(0, 2)}
                                </span>
                                <span>{draftProject.name}</span>
                            </span>
                            <strong>New chat</strong>
                            <span className="chat-card-detail">
                                <Folder />
                                <span>{draftProject.cwd}</span>
                                <Cpu />
                            </span>
                        </Button>
                    )}
                    {activeChats.map(chatCard)}
                    {!chats.length && !draftProject && (
                        <p className="px-2 py-4 text-xs text-muted-foreground">
                            {query
                                ? 'No chats match your search.'
                                : projects.length
                                  ? 'Start a chat from a project.'
                                  : 'Add a project to start chatting.'}
                        </p>
                    )}
                    {settledChats.length > 0 && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="sidebar-shelf-toggle"
                                aria-expanded={showSettled}
                                disabled={Boolean(query)}
                                onClick={toggleSettled}
                            >
                                <span>Settled</span>
                                <span className="text-muted-foreground">
                                    {settledChats.length}
                                </span>
                                <span aria-hidden className="shelf-rule" />
                                <ChevronDown
                                    aria-hidden
                                    className={
                                        showSettled ? 'rotate-180' : undefined
                                    }
                                />
                            </Button>
                            {showSettled && settledChats.map(chatCard)}
                        </>
                    )}
                </div>
            )}
            <div className="sidebar-footer">
                <Button
                    variant="ghost"
                    className={
                        collapsed
                            ? 'sidebar-icon'
                            : 'w-full justify-start text-muted-foreground'
                    }
                    aria-label="Settings"
                    title="Settings"
                    onClick={onOpenSettings}
                >
                    <Settings />
                    {!collapsed && 'Settings'}
                </Button>
            </div>
        </aside>
    );
}
