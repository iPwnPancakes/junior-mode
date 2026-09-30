import { Breadcrumbs } from '@/components/breadcrumbs';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-2" />
                {breadcrumbs.length > 0 && (
                    <Separator
                        orientation="vertical"
                        className="mr-1 data-vertical:h-4 data-vertical:self-center"
                    />
                )}
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
