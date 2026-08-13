<?php

namespace App\Actions;

use App\Models\ClientAuthorization;
use Illuminate\Support\Str;

class CreateClientAuthorization
{
    public const EXPIRES_IN_SECONDS = 600;

    /**
     * @return array{authorization: ClientAuthorization, deviceCode: string, userCode: string}
     */
    public function handle(string $name): array
    {
        $deviceCode = 'jmd_'.Str::random(64);
        $userCode = $this->uniqueUserCode();

        $authorization = ClientAuthorization::create([
            'name' => $name,
            'device_code_hash' => hash('sha256', $deviceCode),
            'user_code_hash' => hash('sha256', $userCode),
            'expires_at' => now()->addSeconds(self::EXPIRES_IN_SECONDS),
        ]);

        return [
            'authorization' => $authorization,
            'deviceCode' => $deviceCode,
            'userCode' => $userCode,
        ];
    }

    private function uniqueUserCode(): string
    {
        do {
            $code = Str::upper(Str::random(8));
            $formattedCode = Str::substr($code, 0, 4).'-'.Str::substr($code, 4);
        } while (ClientAuthorization::query()
            ->where('user_code_hash', hash('sha256', $formattedCode))
            ->exists());

        return $formattedCode;
    }
}
