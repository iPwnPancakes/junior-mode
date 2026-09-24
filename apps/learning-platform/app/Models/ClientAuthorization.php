<?php

namespace App\Models;

use Database\Factories\ClientAuthorizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $device_code_hash
 * @property string $user_code_hash
 * @property Carbon $expires_at
 * @property Carbon|null $approved_at
 * @property Carbon|null $exchanged_at
 * @property int|null $client_connection_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'device_code_hash', 'user_code_hash', 'expires_at', 'approved_at', 'exchanged_at', 'client_connection_id'])]
#[Hidden(['device_code_hash', 'user_code_hash'])]
class ClientAuthorization extends Model
{
    /** @use HasFactory<ClientAuthorizationFactory> */
    use HasFactory;

    /** @return BelongsTo<ClientConnection, $this> */
    public function clientConnection(): BelongsTo
    {
        return $this->belongsTo(ClientConnection::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function hasBeenApproved(): bool
    {
        return $this->approved_at !== null;
    }

    public function hasBeenExchanged(): bool
    {
        return $this->exchanged_at !== null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'approved_at' => 'datetime',
            'exchanged_at' => 'datetime',
        ];
    }
}
