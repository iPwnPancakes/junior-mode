import { usePage } from '@inertiajs/react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HelpRequests from '@/pages/help-requests/index';
import HelpRequest from '@/pages/help-requests/show';
import { renderPage } from '@/test/render-page';

function setRole(role: 'learner' | 'mentor') {
    vi.mocked(usePage).mockReturnValue({
        props: { auth: { user: { id: 1, name: 'Lee', role } } },
    } as ReturnType<typeof usePage>);
}

const helpRequest = {
    id: 1,
    sharedAt: null,
    payload: {
        facts: {
            current_understanding: 'Validation happens before the controller.',
            exact_error_or_unexpected_behavior: 'Expected 422, received 302.',
        },
        likely_knowledge_gap: {
            kind: 'hypothesis',
            summary: 'JSON content negotiation',
        },
        agent_hypotheses: [
            'The request may be missing Accept: application/json.',
        ],
        mentor_questions: ['When does Laravel redirect on validation failure?'],
        progress: {
            competencies: [{ name: 'Request validation', stage: 'guided' }],
        },
    },
};

describe('Help Request review', () => {
    it('shows the exact facts, hypotheses and progress before the explicit named share action', () => {
        setRole('learner');
        renderPage(
            <HelpRequest
                helpRequest={helpRequest}
                canShare
                mentorName="Morgan Mentor"
                previewToken="preview-token"
            />,
        );
        expect(
            screen.getByText('Expected 422, received 302.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Hypotheses to check' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('JSON content negotiation'),
        ).toBeInTheDocument();
        expect(screen.getByText('Request validation')).toBeInTheDocument();
        expect(screen.getByText('Guided')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                name: 'Questions for Morgan Mentor',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Kind/)).not.toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', {
                name: /I reviewed this exact snapshot/,
            }),
        ).toBeRequired();
        expect(screen.getByRole('checkbox')).not.toBeChecked();
        expect(
            screen.getByRole('button', { name: 'Share with Morgan Mentor' }),
        ).toBeInTheDocument();
    });

    it('shows a shared snapshot to the Mentor without a sharing control', () => {
        setRole('mentor');
        renderPage(
            <HelpRequest
                helpRequest={{ ...helpRequest, sharedAt: 'Sep 24, 2026' }}
                learnerName="Lee Learner"
                canShare={false}
                mentorName="Morgan Mentor"
                previewToken={null}
            />,
        );
        expect(
            screen.getByText('Help Request from Lee Learner'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Questions for you' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/This snapshot cannot be changed/),
        ).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Share with/ }),
        ).not.toBeInTheDocument();
    });
});

describe('Help Request list', () => {
    const helpRequests = [
        {
            id: 3,
            title: 'Fix the webhook 500',
            learnerName: 'Lee Learner',
            shared: false,
            createdAt: 'Sep 27, 2026',
        },
    ];

    it('tells a Learner which Help Requests still need their review', () => {
        setRole('learner');
        renderPage(<HelpRequests helpRequests={helpRequests} />);

        expect(
            screen.getByRole('link', { name: /Fix the webhook 500/ }),
        ).toHaveAttribute('href', '/help-requests/3');
        expect(screen.getByText('Waiting for your review')).toBeInTheDocument();
        expect(screen.queryByText(/Lee Learner/)).not.toBeInTheDocument();
    });

    it('attributes each shared Help Request to its Learner for a Mentor', () => {
        setRole('mentor');
        renderPage(
            <HelpRequests
                helpRequests={[{ ...helpRequests[0], shared: true }]}
            />,
        );

        expect(
            screen.getByText('Lee Learner · Sep 27, 2026'),
        ).toBeInTheDocument();
    });

    it('explains how a Help Request appears when there are none', () => {
        setRole('learner');
        renderPage(<HelpRequests helpRequests={[]} />);

        expect(
            screen.getByRole('heading', { name: 'No Help Requests yet' }),
        ).toBeInTheDocument();
    });
});
