import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoachingSessions from '@/pages/coaching-sessions/index';
import { renderPage } from '@/test/render-page';

const session = {
    id: 1,
    learnerName: 'Lee Learner',
    workItem: {
        title: 'Validate profile updates',
        description: 'Add bounded validation to the profile endpoint.',
        externalUrl: 'https://github.com/example/project/issues/41',
    },
    repository: { name: 'Profiles', identity: 'repository-identity' },
    objective: 'Request validation',
    clientSource: 'Codex on laptop',
    status: 'active',
    lastActiveAt: '2026-08-25 16:00:00',
};

describe('Coaching Sessions', () => {
    it('shows Work Item, repository, objective, client source, and status to a Learner', () => {
        renderPage(
            <CoachingSessions viewerRole="learner" sessions={[session]} />,
        );

        expect(
            screen.getByText('Validate profile updates'),
        ).toBeInTheDocument();
        expect(screen.getByText('Profiles')).toBeInTheDocument();
        expect(screen.getByText('Request validation')).toBeInTheDocument();
        expect(screen.getByText('Codex on laptop')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Open Work Item' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/example/project/issues/41',
        );
        expect(screen.queryByText('Lee Learner')).not.toBeInTheDocument();
    });

    it('shows Learner attribution to a Mentor', () => {
        renderPage(
            <CoachingSessions viewerRole="mentor" sessions={[session]} />,
        );

        expect(screen.getByText('Lee Learner')).toBeInTheDocument();
    });
});
