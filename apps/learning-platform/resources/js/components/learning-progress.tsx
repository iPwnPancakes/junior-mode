import { Form } from '@inertiajs/react';
import { useState } from 'react';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { store } from '@/routes/learning-evidence-corrections';

type Evidence = {
    activity: string;
    assistance: string;
    hints_used: number;
    ownership: string;
    learner_work: string;
    agent_work: string;
    verification: { passed: boolean; reference: string };
    teach_back: { demonstrated: boolean; summary: string };
    context_key: string;
    context_description: string;
    source: string;
    transfer_from_id?: number;
    material_difference?: string;
};
type Observation = { id: number; session_id: number; qualifies: boolean; recorded_at: string; evidence: Evidence };
export type Progress = {
    assessment_relationship: string;
    competencies: {
        competency_id: number;
        name: string;
        stage: string;
        has_evidence: boolean;
        next_stage_requirement: string;
        suggested_support: string;
        supporting_evidence: Observation[];
        correction_history: { id: number; supersedes_id: number; reason: string; original_evidence: Evidence }[];
        assistance_trend: { evidence_id: number; assistance: string; hints_used: number }[];
    }[];
};
export type LearningReceipt = { id: number; title: string; completion: { outcome: string; reflection: string; unresolved_questions: string[]; next_challenge: string } };

const label = (value: string) => value.replaceAll('_', ' ');

function EvidenceSummary({ evidence }: { evidence: Evidence }) {
    return <dl className="grid gap-2 text-sm">
        <div><dt className="font-medium">Learner contribution</dt><dd>{evidence.learner_work || 'None recorded'}</dd></div>
        <div><dt className="font-medium">Agent contribution</dt><dd>{evidence.agent_work || 'None recorded'}</dd></div>
        <div><dt className="font-medium">Assistance</dt><dd>{label(evidence.assistance)} · {evidence.hints_used} hints · {label(evidence.ownership)} ownership</dd></div>
        <div><dt className="font-medium">Verification</dt><dd>{evidence.verification.passed ? 'Passed' : 'Not passed'}: {evidence.verification.reference}</dd></div>
        <div><dt className="font-medium">Understanding</dt><dd>{evidence.teach_back.demonstrated ? 'Demonstrated' : 'Not yet demonstrated'}: {evidence.teach_back.summary}</dd></div>
        <div><dt className="font-medium">Context</dt><dd>{evidence.context_description}</dd></div>
        <div><dt className="font-medium">Source</dt><dd>{label(evidence.source)}</dd></div>
        {evidence.material_difference && <div><dt className="font-medium">Transfer to a different context</dt><dd>{evidence.material_difference}</dd></div>}
    </dl>;
}

function Correction({ observation }: { observation: Observation }) {
    const [open, setOpen] = useState(false);
    const evidence = observation.evidence;
    return <div className="mt-3">
        <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Cancel correction' : 'Correct this observation'}</Button>
        {open && <Form {...store.form(observation.id)} transform={(data) => ({ ...data, evidence: { ...evidence, ...(data.evidence as Partial<Evidence>) } })} className="mt-4 grid gap-3">
            {({ errors, processing }) => <>
                <p className="text-sm text-muted-foreground">Your correction appends a new observation. The original remains visible in the history.</p>
                {(['learner_work', 'agent_work', 'context_description'] as const).map((field) => <label key={field} className="grid gap-1 text-sm">{label(field)}<Textarea name={`evidence[${field}]`} defaultValue={evidence[field]} maxLength={1000} /></label>)}
                <label className="grid gap-1 text-sm">Ownership<select name="evidence[ownership]" defaultValue={evidence.ownership} className="rounded-md border p-2">{['learner', 'shared', 'agent'].map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="grid gap-1 text-sm">Assistance<select name="evidence[assistance]" defaultValue={evidence.assistance} className="rounded-md border p-2">{['review_only', 'conceptual_hint', 'guided', 'scaffolded', 'solution_provided'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                <label className="grid gap-1 text-sm">Hints used<Input type="number" name="evidence[hints_used]" min={0} max={100} defaultValue={evidence.hints_used} required /></label>
                <label className="grid gap-1 text-sm">Verification<select name="evidence[verification][passed]" defaultValue={evidence.verification.passed ? '1' : '0'} className="rounded-md border p-2"><option value="1">Passed</option><option value="0">Not passed</option></select></label>
                <label className="grid gap-1 text-sm">Verification reference<Textarea name="evidence[verification][reference]" defaultValue={evidence.verification.reference} required maxLength={1000} /></label>
                <label className="grid gap-1 text-sm">Understanding<select name="evidence[teach_back][demonstrated]" defaultValue={evidence.teach_back.demonstrated ? '1' : '0'} className="rounded-md border p-2"><option value="1">Demonstrated</option><option value="0">Not yet demonstrated</option></select></label>
                <label className="grid gap-1 text-sm">Teach-back summary<Textarea name="evidence[teach_back][summary]" defaultValue={evidence.teach_back.summary} required maxLength={1000} /></label>
                <label className="grid gap-1 text-sm">Reason for correction<Textarea name="correction_reason" required maxLength={1000} /></label>
                {Object.entries(errors).map(([key, error]) => <p key={key} role="alert" className="text-sm text-destructive">{error}</p>)}
                <Button disabled={processing} type="submit">Append correction</Button>
            </>}
        </Form>}
    </div>;
}

export function LearningProgress({ progress, receipts }: { progress: Progress; receipts: LearningReceipt[] }) {
    return <SectionCard title="Learning progress" description={progress.assessment_relationship}>
        <div className="grid gap-5">
            {progress.competencies.length === 0 && <p className="text-sm text-muted-foreground">Learning progress appears when your catalog has competencies.</p>}
            {progress.competencies.map(competency => <article key={competency.competency_id} className="rounded-lg border p-4">
                <h3 className="font-medium">{competency.name} · <span className="capitalize">{competency.has_evidence ? competency.stage : 'Not yet observed'}</span></h3>
                <p className="mt-2 text-sm">{competency.next_stage_requirement}</p>
                <p className="mt-2 text-sm text-muted-foreground">Suggested support: {label(competency.suggested_support)}</p>
                {competency.assistance_trend.length > 0 && <p className="mt-2 text-sm">Assistance over time: {competency.assistance_trend.map(event => `${label(event.assistance)} (${event.hints_used} hints)`).join(' → ')}</p>}
                {competency.supporting_evidence.map(observation => <details key={observation.id} className="mt-3 rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Observation #{observation.id} · {observation.qualifies ? 'Supports progress' : 'Does not establish independence'}</summary><div className="mt-3"><EvidenceSummary evidence={observation.evidence} /><Correction observation={observation} /></div></details>)}
                {competency.correction_history.map(correction => <details key={correction.id} className="mt-3 text-sm"><summary className="cursor-pointer">Correction #{correction.id} replaced #{correction.supersedes_id}</summary><p className="my-2">{correction.reason}</p><EvidenceSummary evidence={correction.original_evidence} /></details>)}
            </article>)}
            {receipts.map(receipt => <article key={receipt.id} className="rounded-lg border p-4"><h3 className="font-medium">Learning receipt: {receipt.title}</h3><p className="mt-2 text-sm">{receipt.completion.outcome}</p><p className="mt-2 text-sm">Reflection: {receipt.completion.reflection}</p><p className="mt-2 text-sm">Next challenge: {receipt.completion.next_challenge}</p>{receipt.completion.unresolved_questions.map(question => <p className="mt-2 text-sm" key={question}>Open question: {question}</p>)}</article>)}
        </div>
    </SectionCard>;
}
