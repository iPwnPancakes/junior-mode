<?php

namespace App\Models;

use Database\Factories\WorkItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property int $enrolled_repository_id
 * @property string $fingerprint
 * @property string $title
 * @property string $description
 * @property string|null $external_url
 * @property array<int, string> $detected_technologies
 * @property array<int, int> $likely_catalog_branches
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['learner_id', 'enrolled_repository_id', 'fingerprint', 'title', 'description', 'external_url', 'detected_technologies', 'likely_catalog_branches'])]
class WorkItem extends Model
{
    /** @use HasFactory<WorkItemFactory> */
    use HasFactory;

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return BelongsTo<EnrolledRepository, $this> */
    public function enrolledRepository(): BelongsTo
    {
        return $this->belongsTo(EnrolledRepository::class);
    }

    /** @return HasOne<CoachingSession, $this> */
    public function coachingSession(): HasOne
    {
        return $this->hasOne(CoachingSession::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['detected_technologies' => 'array', 'likely_catalog_branches' => 'array'];
    }
}
