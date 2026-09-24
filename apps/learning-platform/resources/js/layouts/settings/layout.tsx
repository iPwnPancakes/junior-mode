import { Link } from '@inertiajs/react';
import { Palette, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: UserRound,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
            <PageHeader
                title="Settings"
                description="Manage your profile and account settings"
                eyebrow="Account"
                compact
            />

            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-12">
                <aside className="w-full lg:w-52 lg:shrink-0">
                    <nav
                        className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1 lg:grid-cols-1"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item) => {
                            const isCurrent = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={toUrl(item.href)}
                                    href={item.href}
                                    aria-current={
                                        isCurrent ? 'page' : undefined
                                    }
                                    className={cn(
                                        buttonVariants({
                                            size: 'sm',
                                            variant: isCurrent
                                                ? 'secondary'
                                                : 'ghost',
                                        }),
                                        'min-w-0 justify-center px-2 lg:justify-start lg:px-3',
                                        isCurrent && 'shadow-xs',
                                    )}
                                >
                                    {item.icon && (
                                        <item.icon className="size-4 shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {item.title}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="lg:hidden" />

                <div className="min-w-0 flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
