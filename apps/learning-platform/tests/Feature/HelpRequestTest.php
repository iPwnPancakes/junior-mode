<?php

use App\Models\HelpRequest;
use App\Models\User;
use App\Support\HelpRequestText;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

test('only the learner sees a private Help Request and must review it before explicit sharing', function () {
    Notification::fake();
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $helpRequest = HelpRequest::factory()->create(['learner_id' => $learner->id]);
    $payload = $helpRequest->payload;

    $this->actingAs($mentor)->get(route('help-requests.show', $helpRequest))->assertForbidden();
    $this->actingAs($learner)->post(route('help-requests.share', $helpRequest), ['preview_token' => 'invented', 'reviewed' => true])->assertForbidden();
    $response = $this->actingAs($learner)->get(route('help-requests.show', $helpRequest))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('help-requests/show')->where('helpRequest.payload', $payload)->where('canShare', true)->where('mentorName', $mentor->name));
    expect($helpRequest->fresh()->shared_at)->toBeNull();
    $token = $response->viewData('page')['props']['previewToken'];
    $this->post(route('help-requests.share', $helpRequest), ['preview_token' => $token, 'reviewed' => false])->assertSessionHasErrors('reviewed');
    $this->post(route('help-requests.share', $helpRequest), ['preview_token' => $token, 'reviewed' => true])->assertRedirect(route('help-requests.show', $helpRequest));
    expect($helpRequest->fresh()->payload)->toBe($payload)->and($helpRequest->fresh()->mentor_id)->toBe($mentor->id);
    Notification::assertNothingSent();

    $this->actingAs($mentor)->get(route('help-requests.show', $helpRequest))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('helpRequest.payload', $payload)->where('canShare', false)
            ->where('learnerName', $learner->name)
            ->where('helpRequest.sharedAt', $helpRequest->fresh()->shared_at->toFormattedDateString()));
    $this->get(route('help-requests.index'))->assertInertia(fn (Assert $page) => $page
        ->has('helpRequests', 1)
        ->where('helpRequests.0.learnerName', $learner->name)
        ->where('helpRequests.0.shared', true));
    $this->actingAs(User::factory()->mentor()->create())->get(route('help-requests.show', $helpRequest))->assertForbidden();
    $this->actingAs(User::factory()->learner()->create())->get(route('help-requests.show', $helpRequest))->assertForbidden();
});

test('a changed mentor relationship invalidates the reviewed recipient and previously shared access', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $helpRequest = HelpRequest::factory()->create(['learner_id' => $learner->id]);
    $response = $this->actingAs($learner)->get(route('help-requests.show', $helpRequest));
    $token = $response->viewData('page')['props']['previewToken'];
    $replacement = User::factory()->mentor()->create();
    $learner->update(['mentor_id' => $replacement->id]);
    $this->post(route('help-requests.share', $helpRequest), ['preview_token' => $token, 'reviewed' => true])->assertForbidden();
    expect($helpRequest->fresh()->shared_at)->toBeNull();

    $helpRequest->update(['mentor_id' => $mentor->id, 'shared_at' => now()]);
    $this->actingAs($mentor)->get(route('help-requests.show', $helpRequest))->assertForbidden();
    $this->actingAs($replacement)->get(route('help-requests.show', $helpRequest))->assertForbidden();
    $this->get(route('help-requests.index'))->assertInertia(fn (Assert $page) => $page->has('helpRequests', 0));
    $this->actingAs($learner)->get(route('help-requests.show', $helpRequest))->assertOk();
});

test('links to former handoff pages redirect to the matching Help Request pages', function () {
    $helpRequest = HelpRequest::factory()->create();

    $this->actingAs($helpRequest->learner)->get('/handoffs')->assertRedirect('/help-requests');
    $this->get("/handoffs/{$helpRequest->id}")->assertRedirect(route('help-requests.show', $helpRequest));
});

test('Help Request contents and shared recipient are immutable', function () {
    $helpRequest = HelpRequest::factory()->create();
    expect(fn () => $helpRequest->update(['payload' => ['facts' => ['changed']]]))->toThrow(LogicException::class);
    $helpRequest->refresh()->update(['mentor_id' => User::factory()->mentor()->create()->id, 'shared_at' => now()]);
    expect(fn () => $helpRequest->update(['mentor_id' => User::factory()->mentor()->create()->id]))->toThrow(LogicException::class);
});

test('Help Request summaries remove supported secret patterns and omit source and personal judgments', function (string $raw, string $excluded) {
    expect(app(HelpRequestText::class)->clean($raw))->not->toContain($excluded);
})->with([
    ['Request failed: api_key=secret-value', 'secret-value'],
    ["Error\npassword = multi word secret\nnext line", 'multi word secret'],
    ['Bearer abc12345678901234567890', 'abc12345678901234567890'],
    ['https://user:pass@example.test:8443/issues/1?token=secret#private', 'user:pass'],
    ['https://example.test/issues/1?token=secret#private', 'secret'],
    ["assistant: private discussion\nuser: another reply", 'private discussion'],
    ['```php complete source file```', 'complete source file'],
    ['The learner is lazy', 'lazy'],
]);

test('redacted URLs retain useful host port and path references', function () {
    expect(app(HelpRequestText::class)->clean('https://u:p@example.test:8443/issues/1?key=x#private'))
        ->toBe('https://example.test:8443/issues/1');
});
