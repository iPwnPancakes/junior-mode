import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpenCheck,
    Eye,
    GitBranch,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard, home, login, register } from '@/routes';

const principles = [
    {
        title: 'Learn in real work',
        description:
            'Practice one relevant Learning Objective while completing the Work Item already in front of you.',
        icon: GitBranch,
    },
    {
        title: 'Get graduated guidance',
        description:
            'Start with a bounded attempt, then ask for increasingly specific Hints when you need them.',
        icon: BookOpenCheck,
    },
    {
        title: 'Keep evidence inspectable',
        description:
            'Mentors and Learners can review the same Observations without relying on an opaque score.',
        icon: Eye,
    },
];

export default function Welcome() {
    const { auth, canRegister, name } = usePage().props;

    return (
        <>
            <Head title="Learning-first coaching for real work" />
            <div className="relative min-h-svh overflow-hidden bg-background">
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 -z-0 h-96 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
                />

                <header className="relative z-10 border-b bg-background/80 backdrop-blur">
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <Link
                            href={home()}
                            className="flex items-center gap-2.5 rounded-md font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                                <AppLogoIcon className="size-4.5 fill-current" />
                            </span>
                            <span className="hidden sm:inline">{name}</span>
                        </Link>

                        <nav
                            aria-label="Account navigation"
                            className="flex items-center gap-2"
                        >
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className={buttonVariants()}
                                >
                                    Open dashboard
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className={buttonVariants({
                                            variant: 'ghost',
                                        })}
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className={buttonVariants()}
                                        >
                                            Set up Junior Mode
                                        </Link>
                                    )}
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="relative z-10">
                    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:px-8 lg:py-28">
                        <div className="grid gap-7">
                            <StatusBadge tone="info">
                                Learning-first development
                            </StatusBadge>
                            <div className="grid gap-5">
                                <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                                    Build understanding while you build the
                                    work.
                                </h1>
                                <p className="max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
                                    Junior Mode helps a Learner complete real
                                    engineering work with focused practice,
                                    useful Hints, and a development record their
                                    Mentor can trust.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className={buttonVariants({
                                            size: 'lg',
                                        })}
                                    >
                                        Go to your workspace
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                ) : canRegister ? (
                                    <Link
                                        href={register()}
                                        className={buttonVariants({
                                            size: 'lg',
                                        })}
                                    >
                                        Create the Mentor account
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className={buttonVariants({
                                            size: 'lg',
                                        })}
                                    >
                                        Log in to your workspace
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                )}
                                {!auth.user && canRegister && (
                                    <Link
                                        href={login()}
                                        className={buttonVariants({
                                            size: 'lg',
                                            variant: 'outline',
                                        })}
                                    >
                                        I already have an account
                                    </Link>
                                )}
                            </div>
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ShieldCheck
                                    aria-hidden="true"
                                    className="size-4 text-success"
                                />
                                Self-hosted, private, and active only in
                                Enrolled Repositories.
                            </p>
                        </div>

                        <Card className="relative overflow-hidden shadow-lg shadow-primary/5">
                            <div
                                aria-hidden="true"
                                className="absolute inset-x-0 top-0 h-1 bg-primary"
                            />
                            <CardHeader>
                                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Sparkles
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <CardTitle
                                    role="heading"
                                    aria-level={2}
                                    className="mt-3 text-xl"
                                >
                                    A focused coaching loop
                                </CardTitle>
                                <CardDescription>
                                    One meaningful objective, enough support,
                                    and evidence grounded in the work.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="grid gap-4">
                                    {[
                                        'Select a relevant Learning Objective',
                                        'Reserve one bounded change for the Learner',
                                        'Review the attempt and explain the mental model',
                                        'Record a transparent Observation',
                                    ].map((step, index) => (
                                        <li
                                            key={step}
                                            className="flex items-start gap-3"
                                        >
                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                                                {index + 1}
                                            </span>
                                            <span className="pt-1 text-sm leading-5">
                                                {step}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>
                    </section>

                    <section
                        aria-labelledby="principles-title"
                        className="border-t bg-muted/30"
                    >
                        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:px-8">
                            <div className="grid max-w-2xl gap-2">
                                <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                    Designed for accountable learning
                                </p>
                                <h2
                                    id="principles-title"
                                    className="text-2xl font-semibold tracking-tight sm:text-3xl"
                                >
                                    Assistance that leaves understanding behind.
                                </h2>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                {principles.map((principle) => (
                                    <Card key={principle.title}>
                                        <CardHeader>
                                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <principle.icon
                                                    aria-hidden="true"
                                                    className="size-4.5"
                                                />
                                            </span>
                                            <CardTitle
                                                role="heading"
                                                aria-level={3}
                                                className="mt-3"
                                            >
                                                {principle.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                {principle.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
