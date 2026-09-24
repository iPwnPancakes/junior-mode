<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\BeginCatalogInterview;
use App\Mcp\Tools\CompleteCoachingSession;
use App\Mcp\Tools\GetCoachingBrief;
use App\Mcp\Tools\GetHandoffContext;
use App\Mcp\Tools\GetProgress;
use App\Mcp\Tools\GetSolutionEscapeEligibility;
use App\Mcp\Tools\IdentifyClient;
use App\Mcp\Tools\PrepareHandoff;
use App\Mcp\Tools\RecordCoachingActivity;
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
#[Instructions('Identity comes from the authenticated Learner/client, never a supplied learner ID. Identify the client and resolve repository enrollment (v1) before sending sanitized Work Item context to get-coaching-brief (v1). Select one relevant objective and reuse matching active work or start-coaching-session (v2) with desired outcome, acceptance criteria, ownership split and an idempotency key. Record only observed requested hints and accepted substantive attempts through record-coaching-activity; get-solution-escape-eligibility owns the configurable hint/attempt gate, and a solution_escape write must authorize can_provide_solution before a full solution. Record-learning-evidence requires actual ownership, assistance, verification and teach-back; it cannot set a stage. Complete-coaching-session and get-progress return evidence-derived stages. Retries must preserve payload and idempotency key. Settled/unenrolled work cannot accept activity. Get-handoff-context is read-only; prepare-handoff saves a private preview, and only the Learner can confirm sharing through the website. Never send raw chats, source files or secrets, manufacture unavailable state, queue learning writes locally, or automatically notify a Mentor. Coaching behavior and response formatting belong to the installed plugin.')]
class JuniorModeServer extends Server
{
    protected array $tools = [
        IdentifyClient::class,
        ResolveRepositoryEnrollment::class,
        GetCoachingBrief::class,
        GetHandoffContext::class,
        PrepareHandoff::class,
        StartCoachingSession::class,
        RecordLearningEvidence::class,
        CompleteCoachingSession::class,
        GetProgress::class,
        GetSolutionEscapeEligibility::class,
        RecordCoachingActivity::class,
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
