import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
            />
            <div className="relative z-10 grid w-full max-w-md gap-6">
                <Link
                    href={home()}
                    className="mx-auto flex items-center gap-2.5 rounded-md font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                        <AppLogoIcon className="size-5 fill-current" />
                    </span>
                    <span>{name}</span>
                </Link>

                <Card className="shadow-lg shadow-primary/5">
                    <CardHeader className="text-center">
                        <CardTitle
                            className="text-xl"
                            role="heading"
                            aria-level={1}
                        >
                            {title}
                        </CardTitle>
                        <CardDescription className="leading-5 text-pretty">
                            {description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>{children}</CardContent>
                </Card>
            </div>
        </main>
    );
}
