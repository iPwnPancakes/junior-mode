import { Head } from '@inertiajs/react';
import { BookOpenCheck, UserRound } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

type Props = {
    mentor: {
        id: number;
        name: string;
        email: string;
    };
};

export default function LearnerDashboard({ mentor }: Props) {
    return (
        <>
            <Head title="Learner dashboard" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Learner dashboard"
                    description="Your development record and coaching activity will appear here."
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                    <BookOpenCheck
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <CardTitle role="heading" aria-level={2}>
                                        Your learning record
                                    </CardTitle>
                                    <CardDescription>
                                        Coaching priorities, Competencies, and
                                        recent Observations.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border border-dashed p-8 text-center">
                                <p className="font-medium">
                                    No coaching activity yet
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Your record will grow after your Mentor
                                    prepares your catalog and priorities.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <UserRound
                                    aria-hidden="true"
                                    className="size-5"
                                />
                                <CardTitle role="heading" aria-level={2}>
                                    Your Mentor
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-medium">{mentor.name}</p>
                                <Badge variant="secondary">Mentor</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {mentor.email}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}

LearnerDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Learner dashboard',
            href: dashboard(),
        },
    ],
};
