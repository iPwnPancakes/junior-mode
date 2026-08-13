import { Form, Head } from '@inertiajs/react';
import { UserPlus, Users } from 'lucide-react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { store } from '@/routes/learner-invitations';

type Learner = {
    id: number;
    name: string;
    email: string;
    joinedAt: string | null;
};

type PendingInvitation = {
    id: number;
    email: string;
    expiresAt: string;
};

type Props = {
    learners: Learner[];
    pendingInvitations: PendingInvitation[];
};

export default function MentorDashboard({
    learners,
    pendingInvitations,
}: Props) {
    return (
        <>
            <Head title="Mentor dashboard" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Mentor dashboard"
                    description="Invite Learners and guide their development from one private workspace."
                />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                    <Users
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <CardTitle role="heading" aria-level={2}>
                                        Your Learners
                                    </CardTitle>
                                    <CardDescription>
                                        People whose coaching record you manage.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {learners.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-8 text-center">
                                    <p className="font-medium">
                                        No Learners yet
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Send an invitation to start your private
                                        mentoring workspace.
                                    </p>
                                </div>
                            ) : (
                                <ul
                                    className="grid gap-3"
                                    aria-label="Learners"
                                >
                                    {learners.map((learner) => (
                                        <li
                                            key={learner.id}
                                            className="flex items-center justify-between gap-4 rounded-lg border p-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {learner.name}
                                                </p>
                                                <p className="truncate text-sm text-muted-foreground">
                                                    {learner.email}
                                                </p>
                                            </div>
                                            <Badge variant="secondary">
                                                Learner
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {pendingInvitations.length > 0 && (
                                <section
                                    className="mt-6 grid gap-3"
                                    aria-labelledby="pending-invitations"
                                >
                                    <h3
                                        id="pending-invitations"
                                        className="text-sm font-medium"
                                    >
                                        Pending invitations
                                    </h3>
                                    <ul className="grid gap-2">
                                        {pendingInvitations.map(
                                            (invitation) => (
                                                <li
                                                    key={invitation.id}
                                                    className="flex items-center justify-between gap-4 text-sm"
                                                >
                                                    <span className="truncate">
                                                        {invitation.email}
                                                    </span>
                                                    <span className="shrink-0 text-muted-foreground">
                                                        Expires{' '}
                                                        {invitation.expiresAt}
                                                    </span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </section>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <UserPlus
                                    aria-hidden="true"
                                    className="size-5"
                                />
                                <div className="grid gap-1">
                                    <CardTitle role="heading" aria-level={2}>
                                        Invite a Learner
                                    </CardTitle>
                                    <CardDescription>
                                        Invitations expire after seven days.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...store.form()}
                                resetOnSuccess
                                disableWhileProcessing
                                className="grid gap-4"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="learner-email">
                                                Learner email
                                            </Label>
                                            <Input
                                                id="learner-email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                placeholder="learner@example.com"
                                                required
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Send invitation
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}

MentorDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Mentor dashboard',
            href: dashboard(),
        },
    ],
};
