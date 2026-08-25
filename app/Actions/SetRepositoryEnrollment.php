<?php

namespace App\Actions;

use App\Models\EnrolledRepository;

class SetRepositoryEnrollment
{
    public function handle(EnrolledRepository $repository, bool $enrolled): EnrolledRepository
    {
        $repository->update([
            'enrolled_at' => $enrolled ? now() : $repository->enrolled_at,
            'unenrolled_at' => $enrolled ? null : now(),
        ]);

        return $repository;
    }
}
