import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CompetencyCatalog from '@/pages/competency-catalogs/show';
import { renderPage } from '@/test/render-page';

const learner = {
    id: 2,
    name: 'Lee Learner',
    email: 'lee@example.com',
};

const root = {
    id: 10,
    parentId: null,
    position: 0,
    name: 'Laravel development',
    definition: 'Building web applications with Laravel conventions.',
    demonstrationCriteria: 'Implements and explains an end-to-end request.',
    prerequisites: ['PHP'],
    workOpportunities: ['Feature work'],
    technologies: ['Laravel'],
    archivedAt: null,
    mergedInto: null,
};

const child = {
    id: 11,
    parentId: 10,
    position: 0,
    name: 'Authorization',
    definition: 'Restricting actions to the correct actor.',
    demonstrationCriteria:
        'Writes a policy and tests allowed and denied actors.',
    prerequisites: [],
    workOpportunities: ['Protect a route'],
    technologies: ['Laravel policies'],
    archivedAt: null,
    mergedInto: null,
};

const template = {
    id: 5,
    name: 'Programming foundations',
    description: 'A reusable foundation tree.',
    nodes: [
        {
            id: 50,
            parentId: null,
            position: 0,
            name: 'Programming foundations',
            definition: 'Core concepts for changing software safely.',
            demonstrationCriteria: 'Explains and verifies a bounded change.',
            prerequisites: [],
            workOpportunities: [],
            technologies: [],
        },
    ],
};

describe('Competency Catalog', () => {
    it('renders the empty tree and an accessible, validated creation form', async () => {
        const { user } = renderPage(
            <CompetencyCatalog
                learner={learner}
                canManage
                competencies={[]}
                templates={[]}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: "Lee Learner's Competency Catalog",
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('No Competencies yet')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Add Competency' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Add Competency' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Name' })).toBeRequired();
        expect(
            screen.getByRole('textbox', { name: 'Concise definition' }),
        ).toBeRequired();
        expect(
            screen.getByRole('textbox', {
                name: 'Observable demonstration criteria',
            }),
        ).toHaveAccessibleDescription(
            'Describe behavior a Mentor or Codex could actually observe.',
        );
        expect(
            screen.getByRole('button', { name: 'Add Competency' }),
        ).toBeEnabled();
    });

    it('renders a filesystem-like tree and exposes editing and merge controls', async () => {
        const { user } = renderPage(
            <CompetencyCatalog
                learner={learner}
                canManage
                competencies={[root, child]}
                templates={[template]}
            />,
        );

        const children = screen.getByRole('list', {
            name: 'Children of Laravel development',
        });
        expect(within(children).getByText('Authorization')).toBeInTheDocument();
        expect(screen.getByText('PHP')).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Copy template to Lee Learner',
            }),
        ).toBeEnabled();

        const editButtons = screen.getAllByRole('button', { name: 'Edit' });
        await user.click(editButtons[0]);

        expect(
            screen.getByRole('heading', {
                name: 'Edit Laravel development',
            }),
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
            'Laravel development',
        );
        expect(
            screen.getByRole('button', { name: 'Save changes' }),
        ).toBeEnabled();
    });

    it('keeps a Learner view read-only while showing archived and merged history', () => {
        renderPage(
            <CompetencyCatalog
                learner={learner}
                canManage={false}
                competencies={[
                    {
                        ...root,
                        archivedAt: '2026-08-12',
                        mergedInto: { id: child.id, name: child.name },
                    },
                    child,
                ]}
                templates={[template]}
            />,
        );

        expect(screen.getByText('Archived')).toBeInTheDocument();
        expect(
            screen.getByText('Merged into Authorization'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Add Competency' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: 'Copy template to Lee Learner',
            }),
        ).not.toBeInTheDocument();
    });
});
