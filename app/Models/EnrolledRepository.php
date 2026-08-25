<?php

namespace App\Models;

use Database\Factories\EnrolledRepositoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property string $identity
 * @property string $display_name
 * @property string|null $normalized_remote
 * @property string|null $remote_fingerprint
 * @property string|null $local_path
 * @property Carbon $enrolled_at
 * @property Carbon|null $unenrolled_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'learner_id',
    'identity',
    'display_name',
    'normalized_remote',
    'remote_fingerprint',
    'local_path',
    'enrolled_at',
    'unenrolled_at',
])]
class EnrolledRepository extends Model
{
    /** @use HasFactory<EnrolledRepositoryFactory> */
    use HasFactory;

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    public function isEnrolled(): bool
    {
        return $this->unenrolled_at === null;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
            'unenrolled_at' => 'datetime',
        ];
    }
}
