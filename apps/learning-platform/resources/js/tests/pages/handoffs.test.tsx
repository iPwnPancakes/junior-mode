import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Handoff from '@/pages/handoffs/show';
import { renderPage } from '@/test/render-page';

const handoff = {
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

describe('Mentor handoff review', () => {
    it('shows the exact facts, hypotheses and progress before the explicit named share action', () => {
        renderPage(
            <Handoff
                handoff={handoff}
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
        expect(screen.getByText('guided')).toBeInTheDocument();
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

    it('shows a shared snapshot without a sharing control', () => {
        renderPage(
            <Handoff
                handoff={{ ...handoff, sharedAt: '2026-09-24 12:00:00' }}
                canShare={false}
                mentorName="Morgan Mentor"
                previewToken={null}
            />,
        );
        expect(
            screen.getByText(/This snapshot cannot be changed/),
        ).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Share with/ }),
        ).not.toBeInTheDocument();
    });
});
