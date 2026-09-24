export interface ConnectionState {
    platformUrl: string | null;
    status: 'not-configured' | 'unchecked' | 'connected' | 'unavailable';
    checkedAt: string | null;
    message: string | null;
}

export interface ChatSummary {
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

export interface BackendApi {
    getCodexState(): Promise<CodexState>;
    connectCodex(): Promise<CodexState>;
    startChat(input: { cwd: string }): Promise<CodexState>;
    openChat(id: string): Promise<CodexState>;
    sendMessage(text: string): Promise<CodexState>;
    interruptChat(): Promise<CodexState>;
    respondToCodex(answer: CodexAnswer): Promise<CodexState>;
    subscribeCodex(
        listener: (state: CodexState) => void,
        onError?: (message: string) => void,
    ): () => void;

    getConnection(): Promise<ConnectionState>;
    connectPlatform(url: string): Promise<ConnectionState>;
    checkPlatform(): Promise<ConnectionState>;
    disconnectPlatform(): Promise<ConnectionState>;
}

export function createBackend(options: {
    settingsPath: string;
}): Promise<BackendApi>;
