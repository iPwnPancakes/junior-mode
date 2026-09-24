<?php

use App\Models\HandoffSnapshot;
use App\Models\User;
use App\Support\HandoffText;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

test('only the learner sees a private handoff and must review it before explicit sharing', function () {
    Notification::fake();
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $handoff = HandoffSnapshot::factory()->create(['learner_id' => $learner->id]);
    $payload = $handoff->payload;

    $this->actingAs($mentor)->get(route('handoffs.show', $handoff))->assertForbidden();
    $this->actingAs($learner)->post(route('handoffs.share', $handoff), ['preview_token' => 'invented', 'reviewed' => true])->assertForbidden();
    $response = $this->actingAs($learner)->get(route('handoffs.show', $handoff))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('handoffs/show')->where('handoff.payload', $payload)->where('canShare', true)->where('mentorName', $mentor->name));
    expect($handoff->fresh()->shared_at)->toBeNull();
    $token = $response->viewData('page')['props']['previewToken'];
    $this->post(route('handoffs.share', $handoff), ['preview_token' => $token, 'reviewed' => false])->assertSessionHasErrors('reviewed');
    $this->post(route('handoffs.share', $handoff), ['preview_token' => $token, 'reviewed' => true])->assertRedirect(route('handoffs.show', $handoff));
    expect($handoff->fresh()->payload)->toBe($payload)->and($handoff->fresh()->mentor_id)->toBe($mentor->id);
    Notification::assertNothingSent();

    $this->actingAs($mentor)->get(route('handoffs.show', $handoff))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('handoff.payload', $payload)->where('canShare', false));
    $this->actingAs(User::factory()->mentor()->create())->get(route('handoffs.show', $handoff))->assertForbidden();
    $this->actingAs(User::factory()->learner()->create())->get(route('handoffs.show', $handoff))->assertForbidden();
});

test('a changed mentor relationship invalidates the reviewed recipient and previously shared access', function () {
    $mentor = User::factory()->mentor()->create();
    $learner = User::factory()->learner($mentor)->create();
    $handoff = HandoffSnapshot::factory()->create(['learner_id' => $learner->id]);
    $response = $this->actingAs($learner)->get(route('handoffs.show', $handoff));
    $token = $response->viewData('page')['props']['previewToken'];
    $replacement = User::factory()->mentor()->create();
    $learner->update(['mentor_id' => $replacement->id]);
    $this->post(route('handoffs.share', $handoff), ['preview_token' => $token, 'reviewed' => true])->assertForbidden();
    expect($handoff->fresh()->shared_at)->toBeNull();

    $handoff->update(['mentor_id' => $mentor->id, 'shared_at' => now()]);
    $this->actingAs($mentor)->get(route('handoffs.show', $handoff))->assertForbidden();
    $this->actingAs($replacement)->get(route('handoffs.show', $handoff))->assertForbidden();
    $this->get(route('handoffs.index'))->assertInertia(fn (Assert $page) => $page->has('handoffs', 0));
    $this->actingAs($learner)->get(route('handoffs.show', $handoff))->assertOk();
});

test('handoff contents and shared recipient are immutable', function () {
    $handoff = HandoffSnapshot::factory()->create();
    expect(fn () => $handoff->update(['payload' => ['facts' => ['changed']]]))->toThrow(LogicException::class);
    $handoff->refresh()->update(['mentor_id' => User::factory()->mentor()->create()->id, 'shared_at' => now()]);
    expect(fn () => $handoff->update(['mentor_id' => User::factory()->mentor()->create()->id]))->toThrow(LogicException::class);
});

test('handoff summaries remove supported secret patterns and omit source and personal judgments', function (string $raw, string $excluded) {
    expect(app(HandoffText::class)->clean($raw))->not->toContain($excluded);
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
    expect(app(HandoffText::class)->clean('https://u:p@example.test:8443/issues/1?key=x#private'))
        ->toBe('https://example.test:8443/issues/1');
});
