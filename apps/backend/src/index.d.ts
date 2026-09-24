export interface ConnectionState {
    platformUrl: string | null;
    status: 'not-configured' | 'unchecked' | 'connected' | 'unavailable';
    checkedAt: string | null;
    message: string | null;
}

export interface BackendApi {
    getConnection(): Promise<ConnectionState>;
    connectPlatform(url: string): Promise<ConnectionState>;
    checkPlatform(): Promise<ConnectionState>;
    disconnectPlatform(): Promise<ConnectionState>;
}

export function createBackend(options: {
    settingsPath: string;
}): Promise<BackendApi>;
