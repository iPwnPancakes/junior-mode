import { Head, Link } from '@inertiajs/react';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { index, show } from '@/routes/handoffs';

type Props = {
    handoffs: {
        id: number;
        title: string;
        shared: boolean;
        createdAt: string;
    }[];
};

export default function Handoffs({ handoffs }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Mentor handoffs', href: index() }]}>
            <Head title="Mentor handoffs" />
            <div className="flex flex-col gap-6 p-6">
                <PageHeader
                    title="Mentor handoffs"
                    description="Review a blocker and the smallest question that would help. Sharing never sends a notification or changes progress."
                />
                {handoffs.length === 0 && (
                    <p>
                        No handoffs yet. Ask Junior Mode for a handoff when you
                        are stuck in a Coaching Session.
                    </p>
                )}
                {handoffs.map((handoff) => (
                    <Link
                        key={handoff.id}
                        href={show(handoff.id)}
                        className="rounded-lg border p-4"
                    >
                        <strong>{handoff.title}</strong>
                        <p>
                            {handoff.shared
                                ? 'Shared with Mentor'
                                : 'Private preview'}{' '}
                            · {handoff.createdAt}
                        </p>
                    </Link>
                ))}
            </div>
        </AppLayout>
    );
}
