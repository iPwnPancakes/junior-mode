import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { promisify } from "node:util";
import {
    createCoachingPlugin,
    coachingPluginKey,
} from "../backend/src/coaching-plugin.mjs";
import { createCodexProcess } from "../backend/src/codex-process.mjs";

// Real CLI and app-server; a local Responses fixture proves prompt assembly,
// not model behavior. No account credentials or user config are copied.
test(
    "installed plugin activates only in coaching threads without replacing unrelated Codex configuration",
    { skip: process.env.JUNIOR_TEST_REAL_CODEX !== "1", timeout: 45000 },
    async (t) => {
        const directory = await mkdtemp(
            join(tmpdir(), "junior-plugin-install-"),
        );
        const configPath = join(directory, "config.toml");
        await writeFile(
            configPath,
            '# Existing unrelated setting\nmodel_verbosity = "low"\n',
        );
        const plugin = await createCoachingPlugin({
            marketplaceRoot:
                process.env.JUNIOR_TEST_MARKETPLACE_ROOT ||
                fileURLToPath(new URL("../..", import.meta.url)),
            statePath: join(directory, "plugin.json"),
            runCommand: (command, args, options) =>
                promisify(execFile)(command, args, {
                    ...options,
                    env: { ...options.env, CODEX_HOME: directory },
                }),
        });
        assert.equal((await plugin.state()).installed, false);
        await assert.rejects(plugin.skill(), /Install or update/);
        assert.equal((await plugin.install()).installed, true);
        const configAfterInstall = await readFile(configPath, "utf8");
        assert.ok(
            configAfterInstall.startsWith(
                '# Existing unrelated setting\nmodel_verbosity = "low"',
            ),
        );
        assert.ok(
            configAfterInstall.includes(
                '[plugins."junior-mode@junior-mode-desktop"]',
            ),
        );
        assert.ok(!configAfterInstall.includes("marketplaces"));
        const captured = [];
        const model = createServer(async (request, response) => {
            let body = "";
            for await (const chunk of request) body += chunk;
            if (!request.url.includes("/responses")) {
                response.setHeader("Content-Type", "application/json");
                response.end('{"data":[]}');
                return;
            }
            captured.push(JSON.parse(body));
            response.writeHead(200, { "Content-Type": "text/event-stream" });
            for (const event of [
                {
                    type: "response.created",
                    response: {
                        id: "response",
                        status: "in_progress",
                        output: [],
                    },
                },
                {
                    type: "response.output_item.done",
                    output_index: 0,
                    item: {
                        id: "message",
                        type: "message",
                        role: "assistant",
                        status: "completed",
                        content: [
                            { type: "output_text", text: "Fixture response" },
                        ],
                    },
                },
                {
                    type: "response.completed",
                    response: {
                        id: "response",
                        status: "completed",
                        output: [],
                        usage: {
                            input_tokens: 1,
                            output_tokens: 1,
                            total_tokens: 2,
                        },
                    },
                },
            ])
                response.write(
                    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
                );
            response.end();
        });
        model.listen(0, "127.0.0.1");
        await once(model, "listening");
        let finish;
        const child = createCodexProcess({
            env: { CODEX_HOME: directory },
            config: {
                ...plugin.config,
                model_provider: "fixture",
                model: "fixture",
                "model_providers.fixture.name": "Fixture",
                "model_providers.fixture.base_url": `http://127.0.0.1:${model.address().port}/v1`,
                "model_providers.fixture.wire_api": "responses",
                "model_providers.fixture.requires_openai_auth": false,
            },
            onNotification: (message) => {
                if (message.method === "turn/completed")
                    finish?.(message.params.turn);
            },
            onRequest: () => {},
            onExit: () => {},
        });
        t.after(async () => {
            child.dispose();
            model.closeAllConnections();
            model.close();
            await rm(directory, { recursive: true, force: true });
        });
        await child.request("initialize", {
            clientInfo: { name: "junior_mode_plugin_test", version: "1" },
        });
        child.notify("initialized");
        const discovered = await child.request("skills/list", {
            cwds: [directory],
            forceReload: true,
        });
        assert.equal(
            discovered.data[0].skills.some(
                (skill) => skill.pluginId === "junior-mode@junior-mode-desktop",
            ),
            false,
        );
        async function turn(coaching) {
            const { thread } = await child.request("thread/start", {
                cwd: directory,
                ephemeral: true,
                approvalPolicy: "never",
                sandbox: "read-only",
                config: { [`${coachingPluginKey}.enabled`]: coaching },
            });
            const finished = new Promise((resolve) => {
                finish = resolve;
            });
            await child.request("turn/start", {
                threadId: thread.id,
                input: [
                    ...(coaching ? [await plugin.skill()] : []),
                    { type: "text", text: "Say hello." },
                ],
            });
            assert.equal((await finished).status, "completed");
        }
        await turn(false);
        await turn(true);
        const skill = await readFile((await plugin.skill()).path, "utf8");
        assert.ok(
            !JSON.stringify(captured[0]).includes(
                "Establish authorized context",
            ),
        );
        assert.ok(
            JSON.stringify(captured[1]).includes(
                JSON.stringify(skill).slice(1, -1),
            ),
        );
        assert.equal(await readFile(configPath, "utf8"), configAfterInstall);
    },
);
