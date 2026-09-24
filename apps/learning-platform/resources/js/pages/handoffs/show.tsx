import { Form, Head } from '@inertiajs/react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index, share } from '@/routes/handoffs';

type Value =
    string | number | boolean | null | Value[] | { [key: string]: Value };
type Props = {
    handoff: {
        id: number;
        payload: {
            facts: Record<string, Value>;
            likely_knowledge_gap: Value;
            agent_hypotheses: string[];
            mentor_questions: string[];
            progress: Value;
        };
        sharedAt: string | null;
    };
    canShare: boolean;
    mentorName: string | null;
    previewToken: string | null;
};

function Details({ value }: { value: Value }) {
    if (value === null) {
        return <span>Not recorded</span>;
    }

    if (Array.isArray(value)) {
        return value.length ? (
            <ul className="list-disc space-y-2 pl-5">
                {value.map((entry, i) => (
                    <li key={i}>
                        <Details value={entry} />
                    </li>
                ))}
            </ul>
        ) : (
            <span>None recorded</span>
        );
    }

    if (typeof value === 'object') {
        return (
            <dl className="space-y-3">
                {Object.entries(value).map(([key, entry]) => (
                    <div key={key}>
                        <dt className="font-medium capitalize">
                            {key.replaceAll('_', ' ')}
                        </dt>
                        <dd className="whitespace-pre-wrap text-muted-foreground">
                            <Details value={entry} />
                        </dd>
                    </div>
                ))}
            </dl>
        );
    }

    return <span>{String(value)}</span>;
}

export default function Handoff({
    handoff,
    canShare,
    mentorName,
    previewToken,
}: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Mentor handoffs', href: index() }]}>
            <Head title="Review handoff" />
            <div className="flex max-w-3xl flex-col gap-6 p-6">
                <PageHeader
                    title="Review handoff"
                    description={
                        handoff.sharedAt
                            ? `Shared on ${handoff.sharedAt}. This snapshot cannot be changed.`
                            : 'Private preview. Review every field, including the progress summary, before choosing to share.'
                    }
                />
                <section className="space-y-3 rounded-lg border p-4">
                    <h2 className="text-lg font-semibold">
                        Observed and reported facts
                    </h2>
                    <Details value={handoff.payload.facts} />
                </section>
                <section className="space-y-3 rounded-lg border p-4">
                    <h2 className="text-lg font-semibold">
                        Hypotheses to check
                    </h2>
                    <Details value={handoff.payload.likely_knowledge_gap} />
                    <Details value={handoff.payload.agent_hypotheses} />
                </section>
                <section className="space-y-3 rounded-lg border p-4">
                    <h2 className="text-lg font-semibold">
                        Focused Mentor questions
                    </h2>
                    <Details value={handoff.payload.mentor_questions} />
                </section>
                <section className="space-y-3 rounded-lg border p-4">
                    <h2 className="text-lg font-semibold">
                        Evidence-backed progress included in this snapshot
                    </h2>
                    <Details value={handoff.payload.progress} />
                </section>
                <p>
                    After Mentor help, record what changed in your understanding
                    as a reflection or verified learning evidence in this
                    Coaching Session. Asking for help does not lower progress.
                </p>
                {canShare && (
                    <Form {...share.form(handoff.id)}>
                        {({ processing, errors }) => (
                            <div className="space-y-4 rounded-lg border p-4">
                                <input
                                    type="hidden"
                                    name="preview_token"
                                    value={previewToken ?? ''}
                                />
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        name="reviewed"
                                        value="1"
                                        required
                                    />
                                    <span>
                                        I reviewed this exact snapshot and
                                        choose to share it with {mentorName}.
                                    </span>
                                </label>
                                <p>
                                    This makes the snapshot available to your
                                    Mentor in Junior Mode. No message is sent.
                                    If anything is inaccurate, ask Junior Mode
                                    to generate a corrected preview before
                                    sharing.
                                </p>
                                {Object.values(errors).map((error) => (
                                    <p role="alert" key={error}>
                                        {error}
                                    </p>
                                ))}
                                <Button type="submit" disabled={processing}>
                                    Share with {mentorName}
                                </Button>
                            </div>
                        )}
                    </Form>
                )}
                {!canShare && !handoff.sharedAt && (
                    <p>
                        An active Mentor relationship is required to share this
                        handoff.
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
