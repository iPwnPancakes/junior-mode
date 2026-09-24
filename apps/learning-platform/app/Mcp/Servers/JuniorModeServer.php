<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\BeginCatalogInterview;
use App\Mcp\Tools\CompleteCoachingSession;
use App\Mcp\Tools\GetCoachingBrief;
use App\Mcp\Tools\GetProgress;
use App\Mcp\Tools\IdentifyClient;
use App\Mcp\Tools\RecordLearningEvidence;
use App\Mcp\Tools\ResolveRepositoryEnrollment;
use App\Mcp\Tools\StartCoachingSession;
use App\Mcp\Tools\SubmitCatalogProposal;
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
        ResolveRepositoryEnrollment::class,
        GetCoachingBrief::class,
        StartCoachingSession::class,
        RecordLearningEvidence::class,
        CompleteCoachingSession::class,
        GetProgress::class,
        BeginCatalogInterview::class,
        SubmitCatalogProposal::class,
    ];

    protected array $resources = [
        //
    ];

    protected array $prompts = [
        //
    ];
}
