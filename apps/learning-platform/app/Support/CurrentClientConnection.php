<?php

namespace App\Support;

use App\Models\ClientConnection;

class CurrentClientConnection
{
    private ?ClientConnection $clientConnection = null;

    public function set(ClientConnection $clientConnection): void
    {
        $this->clientConnection = $clientConnection;
    }

    public function get(): ?ClientConnection
    {
        return $this->clientConnection;
    }
}
