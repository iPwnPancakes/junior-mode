import { Link, usePage } from '@inertiajs/react';
import {
    FolderGit2,
    House,
    LifeBuoy,
    MessagesSquare,
    MonitorSmartphone,
    Target,
    Users,
} from 'lucide-react';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard } from '@/routes';
import { index as clientConnections } from '@/routes/client-connections';
import { index as coachingSessions } from '@/routes/coaching-sessions';
import { index as enrolledRepositories } from '@/routes/enrolled-repositories';
import { index as handoffs } from '@/routes/handoffs';
import { show as showLearner } from '@/routes/learners';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();
    const isMentor = auth.user?.role === 'mentor';

    const sharedItems: NavItem[] = [
        {
            title: 'Coaching Sessions',
            href: coachingSessions(),
            icon: MessagesSquare,
        },
        {
            title: 'Handoffs',
            href: handoffs(),
            icon: LifeBuoy,
            isActive: isCurrentOrParentUrl(handoffs()),
        },
    ];

    const coachingItems: NavItem[] = isMentor
        ? [
              {
                  title: 'Learners',
                  href: dashboard(),
                  icon: Users,
                  isActive:
                      isCurrentUrl(dashboard()) ||
                      isCurrentOrParentUrl('/learners/'),
              },
              ...sharedItems,
          ]
        : [
              { title: 'Home', href: dashboard(), icon: House },
              ...(auth.user
                  ? [
                        {
                            title: 'Coaching plan',
                            href: showLearner(auth.user.id),
                            icon: Target,
                        },
                    ]
                  : []),
              ...sharedItems,
          ];

    const setupItems: NavItem[] = [
        {
            title: 'Repositories',
            href: enrolledRepositories(),
            icon: FolderGit2,
        },
        {
            title: 'Codex clients',
            href: clientConnections(),
            icon: MonitorSmartphone,
            isActive: isCurrentOrParentUrl(clientConnections()),
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            render={
                                <Link
                                    href={dashboard()}
                                    prefetch
                                    onClick={() =>
                                        isMobile && setOpenMobile(false)
                                    }
                                />
                            }
                        >
                            <AppLogo
                                subtitle={
                                    isMentor
                                        ? 'Mentor workspace'
                                        : 'Learner workspace'
                                }
                            />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={coachingItems} label="Coaching" />
                <NavMain items={setupItems} label="Setup" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
