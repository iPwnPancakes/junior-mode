import { Head, Link } from '@inertiajs/react';
import { BookOpenCheck, Compass, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { show as showCoachingRecord } from '@/routes/coaching-records';

type Props = {
    learner: {
        id: number;
        name: string;
    };
    mentor: {
        id: number;
        name: string;
        email: string;
    };
};

export default function LearnerDashboard({ learner, mentor }: Props) {
    return (
        <>
            <Head title="Learner dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageHeader
                    title="Learner dashboard"
                    description="Your development record and coaching activity will appear here."
                    eyebrow="Learner workspace"
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <SectionCard
                        title="Your learning record"
                        description="Coaching Priorities, Competencies, and recent Observations."
                        icon={BookOpenCheck}
                    >
                        <div className="grid gap-4">
                            <EmptyState
                                icon={Compass}
                                title="Your complete record"
                                description="Review Assessments and Coaching Priorities chosen by your Mentor."
                            />
                            <Link
                                href={showCoachingRecord(learner.id)}
                                className={buttonVariants()}
                            >
                                View coaching record
                            </Link>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Your Mentor"
                        description="The person responsible for your coaching record."
                        icon={UserRound}
                        className="h-fit"
                        contentClassName="grid gap-2"
                    >
                        <div className="flex min-w-0 items-center justify-between gap-3">
                            <p className="truncate font-medium">
                                {mentor.name}
                            </p>
                            <StatusBadge tone="info">Mentor</StatusBadge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                            {mentor.email}
                        </p>
                    </SectionCard>
                </div>
            </div>
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
