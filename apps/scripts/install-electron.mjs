import { createRequire } from 'node:module';

// Install only Electron's binary; dependency lifecycle scripts stay disabled.
const require = createRequire(
    new URL('../desktop/package.json', import.meta.url),
);
require('electron/install.js');
