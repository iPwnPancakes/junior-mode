<?php

test('clients can identify the learning platform without a session', function () {
    $this->getJson(route('api.v1.health'))
        ->assertOk()
        ->assertExactJson([
            'service' => 'junior-mode',
            'api_version' => 1,
            'status' => 'ok',
        ])
        ->assertCookieMissing(config('session.cookie'));
});
