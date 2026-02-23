import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseCronCommand } from '../server/cronRunner.js';
import { extractTokenFromRequest } from '../server/auth.js';
import { normalizeSkillId, resolveSkillPath, SKILLS_DIR } from '../server/store.js';

test('parseCronCommand allows safe allowlisted command', () => {
    const parsed = parseCronCommand('echo hello');
    assert.equal(parsed?.bin, 'echo');
    assert.deepEqual(parsed?.args, ['hello']);
});

test('parseCronCommand rejects shell operators', () => {
    const parsed = parseCronCommand('echo hello; rm -rf /');
    assert.equal(parsed, null);
});

test('extractTokenFromRequest prefers bearer token', () => {
    const req = {
        headers: {
            authorization: 'Bearer abc123',
            cookie: 'mc_session=xyz789',
        },
    };
    assert.equal(extractTokenFromRequest(req), 'abc123');
});

test('extractTokenFromRequest falls back to cookie token', () => {
    const req = {
        headers: {
            cookie: 'foo=bar; mc_session=xyz789',
        },
    };
    assert.equal(extractTokenFromRequest(req), 'xyz789');
});

test('normalizeSkillId strips invalid characters', () => {
    assert.equal(normalizeSkillId('My Skill @@ 2026'), 'my-skill-2026');
});

test('resolveSkillPath blocks traversal', () => {
    assert.equal(resolveSkillPath('../etc/passwd'), null);
});

test('resolveSkillPath returns path within skill root', () => {
    const p = resolveSkillPath('design-skill');
    assert.ok(p);
    assert.ok(p.startsWith(path.resolve(SKILLS_DIR)));
});
