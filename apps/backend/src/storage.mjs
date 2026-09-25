import { DatabaseSync } from 'node:sqlite';
import { chmod, mkdir, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, posix, win32 } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

export function applicationDataDirectory({
    platform = process.platform,
    env = process.env,
    home = homedir(),
} = {}) {
    const paths = platform === 'win32' ? win32 : posix;
    if (env.JUNIOR_DATA_DIR) {
        if (!paths.isAbsolute(env.JUNIOR_DATA_DIR))
            throw new Error('JUNIOR_DATA_DIR must be an absolute path.');
        return env.JUNIOR_DATA_DIR;
    }
    if (platform === 'win32')
        return paths.join(
            env.LOCALAPPDATA || paths.join(home, 'AppData', 'Local'),
            'Junior Mode',
            'browser',
        );
    if (platform === 'darwin')
        return join(
            home,
            'Library',
            'Application Support',
            'Junior Mode',
            'browser',
        );
    const base =
        env.XDG_DATA_HOME && isAbsolute(env.XDG_DATA_HOME)
            ? env.XDG_DATA_HOME
            : join(home, '.local', 'share');
    return join(base, 'junior-mode', 'browser');
}

async function readLegacy(path, binary = false) {
    try {
        const data = await readFile(path);
        return binary ? data : JSON.parse(data.toString());
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw new Error(
            `Could not migrate ${basename(path)}: ${error.message}`,
        );
    }
}

async function legacyChats(stored) {
    if (stored === undefined) return { projects: [], threads: [] };
    const legacy = Array.isArray(stored);
    const threads = legacy ? stored : stored?.threads;
    const projects = legacy ? [] : stored?.projects;
    if (
        (!legacy && stored?.version !== 2) ||
        !Array.isArray(threads) ||
        !Array.isArray(projects)
    )
        throw new Error('Invalid saved project/chat index.');
    for (const thread of threads) {
        if (
            !thread?.id ||
            typeof thread.cwd !== 'string' ||
            !isAbsolute(thread.cwd)
        )
            throw new Error('Invalid saved chat.');
        if (legacy) {
            const cwd = await realpath(thread.cwd).catch(() => thread.cwd);
            let project = projects.find((entry) => entry.cwd === cwd);
            if (!project) {
                project = { id: randomUUID(), name: basename(cwd) || cwd, cwd };
                projects.push(project);
            }
            thread.projectId = project.id;
        }
    }
    for (const project of projects) {
        if (
            !project?.id ||
            typeof project.name !== 'string' ||
            typeof project.cwd !== 'string' ||
            !isAbsolute(project.cwd)
        )
            throw new Error('Invalid saved project.');
    }
    return { projects, threads };
}

export async function openStorage({
    databasePath,
    legacyDirectory = dirname(databasePath),
    legacySettingsPath,
    legacyChatPath,
    legacyPluginPath,
}) {
    await mkdir(dirname(databasePath), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(databasePath);
    let closed = false;
    function transaction(operation) {
        db.exec('BEGIN IMMEDIATE');
        try {
            const result = operation();
            db.exec('COMMIT');
            return result;
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    }
    try {
        await chmod(databasePath, 0o600);
        db.exec(
            'PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;',
        );
        const version = db.prepare('PRAGMA user_version').get().user_version;
        if (version > 1)
            throw new Error(
                'This database was created by a newer Junior Mode version.',
            );
        transaction(() => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
                CREATE TABLE IF NOT EXISTS credentials (key TEXT PRIMARY KEY, value BLOB NOT NULL) STRICT;
                CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, cwd TEXT NOT NULL UNIQUE, position INTEGER NOT NULL) STRICT;
                CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), cwd TEXT NOT NULL, title TEXT NOT NULL, updated_at TEXT NOT NULL, coaching INTEGER, position INTEGER NOT NULL) STRICT;
                PRAGMA user_version = 1;
            `);
        });
        const getSetting = (key) => {
            const row = db
                .prepare('SELECT value FROM settings WHERE key = ?')
                .get(key);
            return row ? JSON.parse(row.value) : undefined;
        };
        const setSetting = (key, value) =>
            db
                .prepare(
                    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
                )
                .run(key, JSON.stringify(value));
        function writeChats({ projects, threads }) {
            db.exec('DELETE FROM chats; DELETE FROM projects;');
            const projectInsert = db.prepare(
                'INSERT INTO projects (id,name,cwd,position) VALUES (?,?,?,?)',
            );
            projects.forEach((project, index) =>
                projectInsert.run(project.id, project.name, project.cwd, index),
            );
            const chatInsert = db.prepare(
                'INSERT INTO chats (id,project_id,cwd,title,updated_at,coaching,position) VALUES (?,?,?,?,?,?,?)',
            );
            threads.forEach((chat, index) =>
                chatInsert.run(
                    chat.id,
                    chat.projectId,
                    chat.cwd,
                    chat.title,
                    chat.updatedAt,
                    chat.coaching === undefined ? null : Number(chat.coaching),
                    index,
                ),
            );
        }
        const setCredentials = (value) =>
            db
                .prepare(
                    'INSERT INTO credentials (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
                )
                .run('platform', Buffer.from(value));
        if (!getSetting('legacy-imported')) {
            // Read and validate before the transaction; a failed import can be retried.
            // The originals remain untouched, and the marker prevents resurrection
            // of disconnected credentials or stale settings on later launches.
            const [connection, plugin, credentials, savedChats] =
                await Promise.all([
                    readLegacy(
                        legacySettingsPath ||
                            join(legacyDirectory, 'connection.json'),
                    ),
                    readLegacy(
                        legacyPluginPath ||
                            join(legacyDirectory, 'coaching-plugin.json'),
                    ),
                    readLegacy(
                        join(legacyDirectory, 'platform-credentials.json'),
                        true,
                    ),
                    readLegacy(
                        legacyChatPath ||
                            join(legacyDirectory, 'codex-chats.json'),
                    ),
                ]);
            const chats = await legacyChats(savedChats);
            transaction(() => {
                if (getSetting('legacy-imported')) return;
                if (connection !== undefined)
                    setSetting('connection', connection);
                if (plugin !== undefined) setSetting('coaching-plugin', plugin);
                if (credentials !== undefined) setCredentials(credentials);
                writeChats(chats);
                setSetting('legacy-imported', true);
            });
        }
        return {
            databasePath,
            getSetting,
            setSetting,
            removeSetting: (key) =>
                db.prepare('DELETE FROM settings WHERE key = ?').run(key),
            getCredentials() {
                const row = db
                    .prepare('SELECT value FROM credentials WHERE key = ?')
                    .get('platform');
                return row ? Buffer.from(row.value) : undefined;
            },
            setCredentials,
            clearCredentials: () =>
                db
                    .prepare('DELETE FROM credentials WHERE key = ?')
                    .run('platform'),
            loadChats() {
                return {
                    projects: db
                        .prepare(
                            'SELECT id,name,cwd FROM projects ORDER BY position',
                        )
                        .all()
                        .map((row) => ({ ...row })),
                    threads: db
                        .prepare(
                            'SELECT id,project_id AS projectId,cwd,title,updated_at AS updatedAt,coaching FROM chats ORDER BY position',
                        )
                        .all()
                        .map(({ coaching, ...row }) => ({
                            ...row,
                            ...(coaching === null
                                ? {}
                                : { coaching: Boolean(coaching) }),
                        })),
                };
            },
            saveChats: (value) => transaction(() => writeChats(value)),
            close() {
                if (!closed) {
                    db.close();
                    closed = true;
                }
            },
        };
    } catch (error) {
        db.close();
        throw error;
    }
}
