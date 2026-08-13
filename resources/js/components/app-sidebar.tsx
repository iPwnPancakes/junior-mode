import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, MonitorSmartphone } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as clientConnections } from '@/routes/client-connections';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;
    const workspaceName =
        auth.user?.role === 'mentor' ? 'Mentor workspace' : 'Learner workspace';
    const mainNavItems: NavItem[] = [
        {
            title: workspaceName,
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Codex clients',
            href: clientConnections(),
            icon: MonitorSmartphone,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            render={<Link href={dashboard()} prefetch />}
                        >
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label={workspaceName} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
