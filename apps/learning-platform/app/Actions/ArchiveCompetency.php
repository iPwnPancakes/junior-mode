<?php

namespace App\Actions;

use App\Models\Competency;

class ArchiveCompetency
{
    public function handle(Competency $competency): void
    {
        if (! $competency->isArchived()) {
            $competency->update(['archived_at' => now()]);
        }
    }
}
