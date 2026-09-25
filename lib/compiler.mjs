const MAX_TEXT = 20_000;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Node 18 without Web Crypto still gets a deterministic identifier. The
  // approval API uses the same function on both sides of a run.
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function digestManifest(value) { return sha256(canonical(value)); }

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
  if (value.length > MAX_TEXT) throw new Error(`${name} must be ${MAX_TEXT} characters or fewer.`);
  return value.trim();
}

export async function compilePipeline({ name = 'Untitled automation', input = '', output = '' } = {}) {
  const title = text(name, 'Pipeline name').slice(0, 120);
  const inputText = text(input, 'Input description');
  const outputText = text(output, 'Output description');
  const generatedCode = [
    "export async function run(input) {",
    "  const lines = String(input).split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);",
    "  return { text: lines.join('\\n'), lines, wordCount: lines.join(' ').split(/\\s+/).filter(Boolean).length };",
    '}',
  ].join('\n');
  const manifest = {
    schemaVersion: '1.0',
    kind: 'orin.automation.pipeline',
    name: title,
    input: { kind: 'text', description: inputText, maxChars: MAX_TEXT },
    output: { kind: 'text', description: outputText, maxChars: MAX_TEXT },
    steps: [
      { id: 'normalize', kind: 'transform', title: 'Normalize input', code: generatedCode, executable: false },
      { id: 'shape-output', kind: 'transform', title: 'Shape output', code: 'return { ...result, status: "ready" };', executable: false },
      { id: 'notes', kind: 'integration', title: 'Write Logseq-compatible Markdown', integration: 'notes', executable: false },
    ],
    integrations: [{ id: 'notes', mode: 'local-markdown', egress: 'none' }],
    policy: { approval: 'required', network: 'denied', arbitraryCode: 'denied' },
  };
  const manifestHash = await digestManifest(manifest);
  return {
    manifest,
    manifestHash,
    diff: `+ ${title}\n+ input: ${inputText}\n+ output: ${outputText}\n+ approval: exact manifest hash required`,
  };
}

export async function createApproval(manifestHash, now = Date.now(), ttlMs = 15 * 60_000) {
  if (!/^[a-z0-9-]{8,128}$/i.test(String(manifestHash || ''))) throw new Error('A valid manifest hash is required.');
  return { version: 1, manifestHash, approvedAt: now, expiresAt: now + ttlMs, nonce: cryptoRandomId() };
}

function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    return [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('A cryptographically secure random source is required for approval.');
}

export function verifyApproval(approval, manifestHash, now = Date.now()) {
  if (!approval || approval.version !== 1 || !approval.nonce || approval.manifestHash !== manifestHash || !Number.isFinite(approval.expiresAt) || approval.expiresAt <= now) return false;
  return true;
}

/**
 * Execute only the built-in, side-effect-free transform. Generated code is
 * reviewable but is never eval'd in the browser. Network integrations remain
 * disabled until a separately reviewed runtime supplies a secret broker.
 */
export function runSafePipeline(input, manifest, approval, now = Date.now()) {
  if (!verifyApproval(approval, manifest?.manifestHash || manifest?.hash, now)) throw new Error('Approval is missing, expired, or bound to another manifest.');
  const textValue = String(input ?? '');
  if (textValue.length > MAX_TEXT) throw new Error('Input exceeds the manifest limit.');
  const lines = textValue.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return { text: lines.join('\n'), lines, wordCount: lines.join(' ').split(/\s+/).filter(Boolean).length, status: 'ready' };
}

export function renderManifestMarkdown(result) {
  const manifest = result.manifest || result;
  return [
    `# ${manifest.name}`,
    '',
    `- manifest-hash: ${result.manifestHash}`,
    `- approval: exact-hash-required`,
    `- network: denied`,
    '',
    '## Steps',
    ...manifest.steps.map((step) => `- **${step.title}** — ${step.kind} (${step.executable ? 'executable' : 'review-only'})`),
    '',
    '> Generated code is reviewable and is not evaluated by the local preview.',
  ].join('\n');
}
