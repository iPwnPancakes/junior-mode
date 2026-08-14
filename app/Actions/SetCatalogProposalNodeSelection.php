<?php

namespace App\Actions;

use App\Models\CatalogProposalNode;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SetCatalogProposalNodeSelection
{
    public function handle(CatalogProposalNode $node, bool $selected): void
    {
        DB::transaction(function () use ($node, $selected): void {
            $nodes = CatalogProposalNode::query()
                ->where('catalog_proposal_id', $node->catalog_proposal_id)
                ->lockForUpdate()
                ->get();

            $descendantIds = $this->descendantIds($node->id, $nodes);
            CatalogProposalNode::query()
                ->whereKey([$node->id, ...$descendantIds])
                ->update(['selected' => $selected]);

            if ($selected) {
                $ancestorIds = [];
                $parentId = $node->parent_id;

                while ($parentId !== null) {
                    $ancestorIds[] = $parentId;
                    $parentId = $nodes->firstWhere('id', $parentId)?->parent_id;
                }

                CatalogProposalNode::query()->whereKey($ancestorIds)->update(['selected' => true]);
            }
        });
    }

    /**
     * @param  Collection<int, CatalogProposalNode>  $nodes
     * @return array<int, int>
     */
    private function descendantIds(int $parentId, Collection $nodes): array
    {
        $children = $nodes->where('parent_id', $parentId);

        return $children
            ->flatMap(fn (CatalogProposalNode $child): array => [
                $child->id,
                ...$this->descendantIds($child->id, $nodes),
            ])
            ->all();
    }
}
