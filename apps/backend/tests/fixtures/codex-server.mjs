// Deterministic child-process fixture. No model requests or access to real chats.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import process from 'node:process';
import { createInterface } from 'node:readline';
const path = process.env.JUNIOR_CODEX_FIXTURE_STATE || process.argv[2];
let threads = {};
try {
    threads = JSON.parse(readFileSync(path, 'utf8'));
} catch {
    /* new fixture */
}
let thread;
let turn;
let initialized = false;
let waiting;
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const notify = (method, params) => send({ method, params });
const save = () => writeFileSync(path, JSON.stringify(threads));
function finish(text = 'Fixture reply', status = 'completed') {
    const item = { id: `${turn.id}-agent`, type: 'agentMessage', text };
    turn.items.push(item);
    notify('item/started', {
        threadId: thread.id,
        item: { ...item, text: '' },
    });
    notify('item/agentMessage/delta', {
        threadId: thread.id,
        itemId: item.id,
        delta: text,
    });
    notify('item/completed', { threadId: thread.id, item });
    turn.status = status;
    save();
    notify('turn/completed', { threadId: thread.id, turn });
}
createInterface({ input: process.stdin }).on('line', (line) => {
    const message = JSON.parse(line);
    appendFileSync(`${path}.requests`, `${line}\n`);
    const { id, method, params } = message;
    if (!method) {
        notify('serverRequest/resolved', {
            threadId: thread.id,
            requestId: id,
        });
        finish(
            message.error
                ? 'Unsupported request rejected'
                : waiting === 'approval'
                  ? `Decision: ${message.result.decision}`
                  : `Answer: ${message.result.answers.choice.answers[0]}`,
        );
        return;
    }
    if (method === 'initialize') {
        send({ id, result: { userAgent: 'fixture' } });
        return;
    }
    if (method === 'initialized') {
        initialized = true;
        return;
    }
    if (!initialized) {
        send({ id, error: { message: 'Handshake required' } });
        return;
    }
    if (method === 'account/read') {
        send({
            id,
            result: { account: { type: 'chatgpt' }, requiresOpenaiAuth: true },
        });
        return;
    }
    if (method === 'thread/start') {
        thread = {
            id: `thread-${Object.keys(threads).length + 1}`,
            cwd: params.cwd,
            turns: [],
        };
        threads[thread.id] = thread;
        save();
        send({ id, result: { thread } });
        return;
    }
    if (method === 'thread/resume') {
        thread = threads[params.threadId];
        send(
            thread
                ? { id, result: { thread } }
                : { id, error: { message: 'Missing thread' } },
        );
        return;
    }
    if (method === 'turn/start') {
        thread = threads[params.threadId];
        const text = params.input[0].text;
        turn = {
            id: `turn-${thread.turns.length + 1}`,
            status: 'inProgress',
            items: [],
        };
        thread.turns.push(turn);
        send({ id, result: { turn } });
        notify('turn/started', { threadId: thread.id, turn });
        const user = {
            id: `${turn.id}-user`,
            type: 'userMessage',
            content: params.input,
        };
        turn.items.push(user);
        notify('item/completed', { threadId: thread.id, item: user });
        if (text === 'crash') {
            save();
            process.exit(9);
        }
        if (text === 'wait') return;
        if (text === 'approve') {
            waiting = 'approval';
            send({
                id: 700,
                method: 'item/commandExecution/requestApproval',
                params: {
                    threadId: thread.id,
                    turnId: turn.id,
                    itemId: 'command',
                    command: 'echo fixture',
                    cwd: thread.cwd,
                    availableDecisions: ['accept', 'decline', 'cancel'],
                },
            });
            return;
        }
        if (text === 'question') {
            waiting = 'input';
            send({
                id: 701,
                method: 'item/tool/requestUserInput',
                params: {
                    threadId: thread.id,
                    turnId: turn.id,
                    questions: [
                        {
                            id: 'choice',
                            question: 'Which approach?',
                            options: [
                                {
                                    label: 'Small',
                                    description: 'A small change',
                                },
                            ],
                        },
                    ],
                },
            });
            return;
        }
        if (text === 'unsupported') {
            send({
                id: 702,
                method: 'item/permissions/requestApproval',
                params: { threadId: thread.id },
            });
            return;
        }
        setTimeout(() => finish(), 30);
        return;
    }
    if (method === 'turn/interrupt') {
        send({ id, result: {} });
        finish('Stopped', 'interrupted');
        return;
    }
    send({ id, error: { message: `Unexpected method ${method}` } });
});
