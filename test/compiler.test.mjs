import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePipeline, createApproval, digestManifest, runSafePipeline, verifyApproval } from '../lib/compiler.mjs';

const request = { name: 'Inbox to notes', input: 'Collect updates', output: 'A Markdown page' };

test('compiler emits an immutable manifest and readable diff', async () => {
  const result = await compilePipeline(request);
  assert.match(result.manifestHash, /^[a-f0-9]{64}$/);
  assert.equal(result.manifest.kind, 'orin.automation.pipeline');
  assert.equal(result.manifest.steps.length, 3);
  assert.equal(result.manifest.steps[0].executable, false);
  assert.match(result.diff, /Inbox to notes/);
  assert.equal(await digestManifest(result.manifest), result.manifestHash);
});

test('approval is exact-hash, expiring, and one pipeline', async () => {
  const first = await compilePipeline(request);
  const second = await compilePipeline({ ...request, output: 'Different output' });
  const now = 1_000;
  const approval = await createApproval(first.manifestHash, now, 500);
  assert.equal(verifyApproval(approval, first.manifestHash, now + 499), true);
  assert.equal(verifyApproval(approval, second.manifestHash, now + 1), false);
  assert.equal(verifyApproval(approval, first.manifestHash, now + 501), false);
  const output = runSafePipeline(' one\n\n two ', first, approval, now + 1);
  assert.deepEqual(output.lines, ['one', 'two']);
  assert.equal(output.wordCount, 2);
});

test('safe runner does not evaluate generated code or use network', async () => {
  const result = await compilePipeline(request);
  const approval = await createApproval(result.manifestHash);
  const output = runSafePipeline('alpha beta', result, approval);
  assert.equal(output.status, 'ready');
  assert.equal(output.text, 'alpha beta');
  assert.throws(() => runSafePipeline('x'.repeat(20_001), result, approval), /limit/);
});
