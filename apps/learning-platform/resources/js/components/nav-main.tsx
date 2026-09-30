import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

/**
 * The current page reads as a raised tab that matches the content panel, so it
 * stays distinguishable from the hover fill of the item under the pointer.
 */
const currentPageClasses =
    'data-active:bg-card data-active:text-foreground data-active:shadow-xs data-active:ring-1 data-active:ring-sidebar-border data-active:hover:bg-card data-active:[&_svg]:text-primary';

export function NavMain({
    items = [],
    label,
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <SidebarGroup className="py-0">
            {label && (
                // The collapsed label is invisible but still overlaps the item
                // above it, so it must not swallow that item's pointer events.
                <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
                    {label}
                </SidebarGroupLabel>
            )}
            <SidebarMenu>
                {items.map((item) => {
                    const isActive = item.isActive ?? isCurrentUrl(item.href);

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                render={
                                    <Link
                                        href={item.href}
                                        prefetch
                                        aria-current={
                                            isActive ? 'page' : undefined
                                        }
                                        onClick={() =>
                                            isMobile && setOpenMobile(false)
                                        }
                                    />
                                }
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                                className={currentPageClasses}
                            >
                                {item.icon && <item.icon aria-hidden="true" />}
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
