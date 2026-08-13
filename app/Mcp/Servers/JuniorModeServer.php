<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\IdentifyClient;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Junior Mode Server')]
#[Version('1.0.0')]
#[Instructions('Authenticated Junior Mode operations are attributed to the connected Learner and named Codex client.')]
class JuniorModeServer extends Server
{
    protected array $tools = [
        IdentifyClient::class,
    ];

    protected array $resources = [
        //
    ];

    protected array $prompts = [
        //
    ];
}
