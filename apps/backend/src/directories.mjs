import { opendir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

export async function browseDirectories(input = {}) {
    if (
        !input ||
        typeof input.path !== 'string' ||
        input.path.length > 4096 ||
        input.path.includes('\0')
    ) {
        throw new Error('Enter a folder path of at most 4096 characters.');
    }
    if (
        input.showHidden !== undefined &&
        typeof input.showHidden !== 'boolean'
    ) {
        throw new Error('Show hidden folders must be true or false.');
    }
    const home = homedir();
    let path = input.path;
    if (!path || path === '~') path = home;
    else if (path.startsWith('~/') || (sep === '\\' && path.startsWith('~\\')))
        path = join(home, path.slice(2));
    if (!isAbsolute(path))
        throw new Error(
            'Enter an absolute path, or start with ~/ for your home folder.',
        );
    const candidate = resolve(path);
    let directory = candidate;
    let currentPath = null;
    let prefix = '';
    try {
        if (!(await stat(candidate)).isDirectory())
            throw new Error('That path is a file. Choose a folder.');
        currentPath = candidate;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            if (error.code === 'EACCES' || error.code === 'EPERM')
                throw new Error(
                    'You do not have permission to browse this folder.',
                );
            throw error;
        }
        directory = dirname(candidate);
        prefix = basename(candidate).toLocaleLowerCase();
    }
    const entries = [];
    let truncated = false;
    try {
        const handle = await opendir(directory);
        let scanned = 0;
        for await (const entry of handle) {
            if (++scanned > 10000) {
                truncated = true;
                break;
            }
            if (!entry.name.toLocaleLowerCase().startsWith(prefix)) continue;
            if (
                !input.showHidden &&
                !prefix.startsWith('.') &&
                entry.name.startsWith('.')
            )
                continue;
            const fullPath = join(directory, entry.name);
            let folder = entry.isDirectory();
            if (entry.isSymbolicLink()) {
                try {
                    folder = (await stat(fullPath)).isDirectory();
                } catch {
                    continue;
                }
            }
            if (!folder) continue;
            if (entries.length >= 100) {
                truncated = true;
                break;
            }
            entries.push({ name: entry.name, path: fullPath });
        }
    } catch (error) {
        if (['EACCES', 'EPERM'].includes(error.code))
            throw new Error(
                'You do not have permission to browse this folder.',
            );
        if (['ENOENT', 'ENOTDIR'].includes(error.code))
            throw new Error('Folder not found. Check the parent path.');
        throw error;
    }
    entries.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base',
        }),
    );
    return {
        directory,
        currentPath,
        parentPath: dirname(directory),
        home,
        separator: sep,
        entries,
        truncated,
    };
}
