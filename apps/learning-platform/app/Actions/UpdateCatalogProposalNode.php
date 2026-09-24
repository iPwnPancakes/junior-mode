<?php

namespace App\Actions;

use App\Models\CatalogProposalNode;
use App\Support\CompetencyMetadata;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateCatalogProposalNode
{
    /** @param array<string, mixed> $data */
    public function handle(CatalogProposalNode $node, array $data): CatalogProposalNode
    {
        return DB::transaction(function () use ($node, $data): CatalogProposalNode {
            $node = CatalogProposalNode::query()->lockForUpdate()->findOrFail($node->id);
            $parentId = isset($data['parent_id']) ? (int) $data['parent_id'] : null;
            $this->ensureValidParent($node, $parentId);

            CatalogProposalNode::query()
                ->where('catalog_proposal_id', $node->catalog_proposal_id)
                ->where('parent_id', $node->parent_id)
                ->whereKeyNot($node->id)
                ->where('position', '>', $node->position)
                ->decrement('position');

            $targetSiblings = CatalogProposalNode::query()
                ->where('catalog_proposal_id', $node->catalog_proposal_id)
                ->where('parent_id', $parentId)
                ->whereKeyNot($node->id)
                ->lockForUpdate();
            $position = min((int) Arr::get($data, 'position', $targetSiblings->count()), $targetSiblings->count());

            (clone $targetSiblings)->where('position', '>=', $position)->increment('position');

            $node->update([
                ...Arr::only($data, ['name', 'definition', 'demonstration_criteria']),
                ...CompetencyMetadata::fromForm($data),
                'parent_id' => $parentId,
                'position' => $position,
            ]);

            return $node->refresh();
        });
    }

    private function ensureValidParent(CatalogProposalNode $node, ?int $parentId): void
    {
        if ($parentId === null) {
            return;
        }

        $parent = CatalogProposalNode::query()->find($parentId);

        if ($parent === null || $parent->catalog_proposal_id !== $node->catalog_proposal_id) {
            throw ValidationException::withMessages([
                'parent_id' => __('The selected parent must belong to this Catalog Proposal.'),
            ]);
        }

        while ($parent !== null) {
            if ($parent->id === $node->id) {
                throw ValidationException::withMessages([
                    'parent_id' => __('A proposed node cannot be moved beneath itself or one of its descendants.'),
                ]);
            }

            $parent = $parent->parent_id === null
                ? null
                : CatalogProposalNode::query()->find($parent->parent_id);
        }
    }
}
