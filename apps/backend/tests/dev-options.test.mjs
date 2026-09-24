import assert from 'node:assert/strict';
import { test } from 'node:test';
import { devOptions } from '../../scripts/dev-options.mjs';

test('development host supports CLI and environment configuration while defaulting to loopback', () => {
    assert.deepEqual(devOptions([]), {
        host: '127.0.0.1',
        client: true,
        platform: true,
    });
    assert.equal(devOptions(['--host', '0.0.0.0']).host, '0.0.0.0');
    assert.equal(devOptions(['--host=192.168.0.54']).host, '192.168.0.54');
    assert.equal(
        devOptions([], { DEV_HOST: '100.87.148.87' }).host,
        '100.87.148.87',
    );
    assert.equal(
        devOptions(['--host', '::'], { DEV_HOST: '127.0.0.1' }).host,
        '::',
    );
    assert.equal(devOptions(['--client', '--host', '0.0.0.0']).platform, false);
    assert.equal(devOptions(['--platform', '--host', '0.0.0.0']).client, false);
    for (const args of [
        ['--host'],
        ['--host', '0.0.0.0; touch /tmp/unwanted'],
        ['--host', '$(whoami)'],
        ['--host', 'http://host'],
        ['--unknown'],
        ['--client', '--platform'],
    ]) {
        assert.throws(() => devOptions(args));
    }
});
