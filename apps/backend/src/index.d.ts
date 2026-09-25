export interface ConnectionState {
    platformUrl: string | null;
    status: 'not-configured' | 'unchecked' | 'connected' | 'unavailable';
    checkedAt: string | null;
    message: string | null;
}

export interface PlatformAuthorization {
    status: string;
    learner: string | null;
    client: string | null;
    authorizationUrl: string | null;
    userCode: string | null;
}

export interface Project {
    id: string;
    name: string;
    cwd: string;
}

export interface ChatSummary {
    projectId: string;
    coaching?: boolean;
    id: string;
    cwd: string;
    title: string;
    updatedAt: string;
}

export interface ChatItem {
    id: string;
    type: string;
    text: string;
    status: string;
}

export interface CodexRequest {
    id: string;
    kind: 'approval' | 'input';
    title: string;
    detail?: string;
    decisions?: string[];
    questions?: Array<{
        id: string;
        question: string;
        isSecret?: boolean;
        options?: Array<{ label: string; description: string }>;
    }>;
}

export interface CodexState {
    instanceId: string;
    host: string;
    status: 'disconnected' | 'connecting' | 'ready';
    account: string | null;
    error: string | null;
    revision: number;
    projects: Project[];
    threads: ChatSummary[];
    thread:
        | (ChatSummary & {
              items: ChatItem[];
              turnId: string | null;
              status: string;
          })
        | null;
    requests: CodexRequest[];
}

export interface CodexAnswer {
    id: string;
    decision?: string;
    answers?: Record<string, string>;
}

export interface CoachingPluginState {
    installed: boolean;
    version: string;
}

export interface DirectoryListing {
    directory: string;
    currentPath: string | null;
    parentPath: string;
    home: string;
    separator: string;
    entries: Array<{ name: string; path: string }>;
    truncated: boolean;
}

export interface BackendApi {
    browseDirectories(input: {
        path: string;
        showHidden?: boolean;
    }): Promise<DirectoryListing>;
    getCoachingPlugin(): Promise<CoachingPluginState>;
    installCoachingPlugin(): Promise<CoachingPluginState>;
    getCodexState(): Promise<CodexState>;
    connectCodex(): Promise<CodexState>;
    addProject(input: {
        cwd: string;
    }): Promise<{ state: CodexState; project: Project }>;
    startChat(
        input:
            | { projectId: string; coaching?: boolean }
            | { cwd: string; coaching?: boolean },
    ): Promise<CodexState>;
    openChat(id: string): Promise<CodexState>;
    sendMessage(text: string): Promise<CodexState>;
    interruptChat(): Promise<CodexState>;
    respondToCodex(answer: CodexAnswer): Promise<CodexState>;
    subscribeCodex(
        listener: (state: CodexState) => void,
        onError?: (message: string) => void,
    ): () => void;

    openPlatformAuthorization(): Promise<void>;
    getPlatformAuthorization(): Promise<PlatformAuthorization>;
    beginPlatformAuthorization(name: string): Promise<PlatformAuthorization>;
    completePlatformAuthorization(): Promise<PlatformAuthorization>;
    checkPlatformAuthorization(): Promise<PlatformAuthorization>;
    getConnection(): Promise<ConnectionState>;
    connectPlatform(url: string): Promise<ConnectionState>;
    checkPlatform(): Promise<ConnectionState>;
    disconnectPlatform(): Promise<ConnectionState>;
}

export function createBackend(options: {
    settingsPath?: string;
    dataDirectory?: string;
    legacyDirectory?: string;
}): Promise<BackendApi>;
