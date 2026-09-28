export type PlanLearner = {
    id: number;
    name: string;
    email: string;
};

export type ExpirationMode =
    'default_duration' | 'custom_date' | 'until_removed';

export type CoachingFocus = {
    id: number;
    competencyId: number;
    competencyName: string;
    emphasis: 'normal' | 'high';
    expirationMode: ExpirationMode;
    expiresOn: string | null;
    status: string;
    displayStatus: string;
    displayStatusLabel: string;
    note: string | null;
    createdAt: string | null;
    resolvedAt: string | null;
    replacement: { id: number; competencyName: string } | null;
};

export type AssessmentLevel =
    'not_yet_observed' | 'developing' | 'consistent' | 'independent';

export type PlanCompetency = {
    id: number;
    parentId: number | null;
    name: string;
    definition: string;
    demonstrationCriteria: string;
    prerequisites: string[];
    workOpportunities: string[];
    technologies: string[];
    archivedAt: string | null;
    mergedInto: { id: number; name: string } | null;
    level: {
        value: AssessmentLevel;
        label: string;
        rationale: string | null;
        assessedAt: string;
    } | null;
    focus: CoachingFocus | null;
};

export type TemplateNode = {
    id: number;
    parentId: number | null;
    position: number;
    name: string;
    definition: string;
    demonstrationCriteria: string;
    prerequisites: string[];
    workOpportunities: string[];
    technologies: string[];
};

export type CompetencyTemplate = {
    id: number;
    name: string;
    description: string;
    nodes: TemplateNode[];
};

export type AssessmentRecord = {
    id: number;
    competencyName: string;
    level: AssessmentLevel;
    levelLabel: string;
    rationale: string | null;
    assessedBy: string;
    assessedAt: string;
};
