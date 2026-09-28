import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeftRight, LogOut, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { switchAccount } from '@/routes/development';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { developmentAccountSwitch } = usePage().props;

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <UserInfo user={user} showEmail={true} />
                    </div>
                </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem
                    render={
                        <Link
                            className="block w-full cursor-pointer"
                            href={edit()}
                            prefetch
                            onClick={cleanup}
                        />
                    }
                >
                    <Settings className="mr-2" />
                    Settings
                </DropdownMenuItem>
                {developmentAccountSwitch && (
                    <DropdownMenuItem
                        render={
                            <Link
                                className="block w-full cursor-pointer"
                                href={switchAccount()}
                                as="button"
                                onClick={cleanup}
                                data-test="switch-account-button"
                            />
                        }
                    >
                        <ArrowLeftRight className="mr-2" />
                        Switch to {developmentAccountSwitch} account
                    </DropdownMenuItem>
                )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem
                    render={
                        <Link
                            className="block w-full cursor-pointer"
                            href={logout()}
                            as="button"
                            onClick={handleLogout}
                            data-test="logout-button"
                        />
                    }
                >
                    <LogOut className="mr-2" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </>
    );
}
