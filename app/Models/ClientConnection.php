<?php

namespace App\Models;

use Database\Factories\ClientConnectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $learner_id
 * @property string $name
 * @property string|null $token_hash
 * @property Carbon $authorized_at
 * @property Carbon|null $last_used_at
 * @property Carbon|null $revoked_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['learner_id', 'name', 'token_hash', 'authorized_at', 'last_used_at', 'revoked_at'])]
#[Hidden(['token_hash'])]
class ClientConnection extends Model
{
    /** @use HasFactory<ClientConnectionFactory> */
    use HasFactory;

    /** @return BelongsTo<User, $this> */
    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    /** @return HasOne<ClientAuthorization, $this> */
    public function authorization(): HasOne
    {
        return $this->hasOne(ClientAuthorization::class);
    }

    /** @return HasMany<CatalogProposal, $this> */
    public function catalogProposals(): HasMany
    {
        return $this->hasMany(CatalogProposal::class);
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isAwaitingExchange(): bool
    {
        return $this->token_hash === null && ! $this->isRevoked();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'authorized_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }
}
