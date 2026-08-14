<?php

namespace App\Actions;

use App\CatalogProposalStatus;
use App\Models\CatalogProposal;
use App\Models\ClientConnection;
use App\Models\User;

class BeginCatalogInterview
{
    public function handle(User $learner, ClientConnection $clientConnection): CatalogProposal
    {
        return CatalogProposal::query()->firstOrCreate(
            [
                'learner_id' => $learner->id,
                'client_connection_id' => $clientConnection->id,
                'status' => CatalogProposalStatus::Interviewing,
            ],
        );
    }
}
