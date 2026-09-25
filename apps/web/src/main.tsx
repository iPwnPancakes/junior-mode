import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Badge } from '@/components/ui/badge';
import { isDesktop } from './backend';
import { Chat } from './chat';
import { Settings } from './settings';
import './style.css';

function App() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    return (
        <div className="app chat-app gap-0">
            <header>
                <a className="brand" href="#">
                    <span className="mark">jm</span> Junior Mode
                </a>
                <Badge variant="outline" className="surface">
                    {isDesktop ? 'Desktop' : 'Browser preview'}
                </Badge>
            </header>
            <div className={settingsOpen ? 'hidden' : 'flex min-h-0 flex-1'}>
                <Chat onOpenSettings={() => setSettingsOpen(true)} />
            </div>
            {settingsOpen && <Settings onBack={() => setSettingsOpen(false)} />}
        </div>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
