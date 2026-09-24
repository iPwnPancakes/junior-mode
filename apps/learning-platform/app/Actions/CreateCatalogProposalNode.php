<?php

namespace App\Actions;

use App\Models\CatalogProposal;
use App\Models\CatalogProposalNode;
use App\Support\CompetencyMetadata;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class CreateCatalogProposalNode
{
    /** @param array<string, mixed> $data */
    public function handle(CatalogProposal $catalogProposal, array $data): CatalogProposalNode
    {
        return DB::transaction(function () use ($catalogProposal, $data): CatalogProposalNode {
            $parentId = Arr::get($data, 'parent_id');
            $siblings = $catalogProposal->nodes()
                ->where('parent_id', $parentId)
                ->lockForUpdate();
            $position = min((int) Arr::get($data, 'position', $siblings->count()), $siblings->count());

            (clone $siblings)->where('position', '>=', $position)->increment('position');

            return $catalogProposal->nodes()->create([
                ...Arr::only($data, ['name', 'definition', 'demonstration_criteria']),
                ...CompetencyMetadata::fromForm($data),
                'parent_id' => $parentId,
                'position' => $position,
                'selected' => true,
            ]);
        });
    }
}
