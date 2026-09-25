import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isDesktop } from './backend';
import { Chat } from './chat';
import { Settings } from './settings';
import './style.css';

function App() {
    const [tab, setTab] = useState('chat');
    return (
        <Tabs value={tab} onValueChange={setTab} className="app chat-app gap-0">
            <header>
                <a className="brand" href="#">
                    <span className="mark">jm</span> Junior Mode
                </a>
                <TabsList aria-label="Main navigation">
                    <TabsTrigger value="chat">
                        <MessageSquare />
                        Chat
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <SettingsIcon />
                        Settings
                    </TabsTrigger>
                </TabsList>
                <Badge variant="outline" className="surface">
                    {isDesktop ? 'Desktop' : 'Browser preview'}
                </Badge>
            </header>
            <TabsContent
                forceMount
                value="chat"
                className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
            >
                <Chat />
            </TabsContent>
            <TabsContent value="settings" className="flex min-h-0 flex-1">
                <Settings />
            </TabsContent>
        </Tabs>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
