<?php

namespace Database\Seeders;

use App\Models\CompetencyTemplate;
use App\Models\CompetencyTemplateNode;
use Illuminate\Database\Seeder;

class CompetencyTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $foundations = CompetencyTemplate::query()->updateOrCreate(
            ['name' => 'Programming foundations'],
            ['description' => 'Stack-neutral foundations for reasoning about code and verifying behavior.'],
        );
        $foundationsRoot = $this->node($foundations, null, 0, [
            'name' => 'Programming foundations',
            'definition' => 'Core concepts used to understand and change software safely.',
            'demonstration_criteria' => 'Explains program behavior, makes a bounded change, and verifies the result.',
            'work_opportunities' => ['Feature work', 'Bug fixes', 'Code review'],
        ]);
        $this->node($foundations, $foundationsRoot, 0, [
            'name' => 'Control flow',
            'definition' => 'How conditions, loops, calls, and returns determine which work a program performs.',
            'demonstration_criteria' => 'Traces an execution path and changes branching behavior without introducing unreachable or unintended paths.',
        ]);
        $this->node($foundations, $foundationsRoot, 1, [
            'name' => 'Data modeling',
            'definition' => 'Representing domain concepts, relationships, constraints, and lifecycle state in code and storage.',
            'demonstration_criteria' => 'Chooses representations that preserve domain rules and explains the important relationships and constraints.',
        ]);
        $this->node($foundations, $foundationsRoot, 2, [
            'name' => 'Automated testing',
            'definition' => 'Using executable examples to verify observable behavior and prevent regressions.',
            'demonstration_criteria' => 'Writes a focused test that fails for the missing behavior and passes for the implemented behavior.',
            'technologies' => ['Pest', 'Vitest'],
        ]);

        $laravel = CompetencyTemplate::query()->updateOrCreate(
            ['name' => 'Laravel web applications'],
            ['description' => 'A reusable starting tree for Laravel applications with an Inertia frontend.'],
        );
        $laravelRoot = $this->node($laravel, null, 0, [
            'name' => 'Laravel application development',
            'definition' => 'Building server-driven web applications with Laravel conventions and clear domain boundaries.',
            'demonstration_criteria' => 'Implements an end-to-end behavior using framework conventions and verifies it at an integrated seam.',
            'prerequisites' => ['Programming foundations'],
            'technologies' => ['PHP', 'Laravel', 'Inertia'],
        ]);
        $this->node($laravel, $laravelRoot, 0, [
            'name' => 'HTTP request lifecycle',
            'definition' => 'How routes, middleware, validation, controllers, and responses collaborate for a request.',
            'demonstration_criteria' => 'Traces a request through the application and places behavior at the appropriate boundary.',
            'technologies' => ['Laravel', 'Inertia'],
        ]);
        $this->node($laravel, $laravelRoot, 1, [
            'name' => 'Eloquent relationships',
            'definition' => 'Expressing and querying relationships between persisted domain records.',
            'demonstration_criteria' => 'Defines the correct relationship, applies ownership constraints, and avoids avoidable N+1 queries.',
            'technologies' => ['Laravel', 'Eloquent'],
        ]);
        $this->node($laravel, $laravelRoot, 2, [
            'name' => 'Authorization',
            'definition' => 'Restricting actions and records according to the authenticated actor and domain relationship.',
            'demonstration_criteria' => 'Enforces authorization on the server and tests allowed and forbidden actors.',
            'technologies' => ['Laravel policies'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function node(
        CompetencyTemplate $template,
        ?CompetencyTemplateNode $parent,
        int $position,
        array $attributes,
    ): CompetencyTemplateNode {
        return CompetencyTemplateNode::query()->updateOrCreate(
            [
                'competency_template_id' => $template->id,
                'parent_id' => $parent?->id,
                'name' => $attributes['name'],
            ],
            [
                ...$attributes,
                'position' => $position,
                'definition' => $attributes['definition'],
                'demonstration_criteria' => $attributes['demonstration_criteria'],
                'prerequisites' => $attributes['prerequisites'] ?? null,
                'work_opportunities' => $attributes['work_opportunities'] ?? null,
                'technologies' => $attributes['technologies'] ?? null,
            ],
        );
    }
}
