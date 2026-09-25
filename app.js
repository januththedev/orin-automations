import { compilePipeline, createApproval, runSafePipeline, renderManifestMarkdown } from './lib/compiler.mjs';
import { addBlock, parseLogseqPage, serializeLogseqPage } from './lib/notes.mjs';

const $ = (id) => document.getElementById(id);
let compiled = null;
let approval = null;

function setStatus(message, kind = 'info') {
  const node = $('status');
  node.textContent = message;
  node.dataset.kind = kind;
}

function showCompiled() {
  $('manifest').textContent = JSON.stringify(compiled.manifest, null, 2);
  $('diff').textContent = compiled.diff;
  $('manifest-markdown').textContent = renderManifestMarkdown(compiled);
  $('hash').textContent = compiled.manifestHash;
  $('approve').disabled = false;
  $('run').disabled = true;
  $('approval-state').textContent = 'Approval required for this exact manifest hash.';
}

$('compile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    setStatus('Compiling a reviewable manifest…');
    compiled = await compilePipeline({
      name: $('name').value,
      input: $('input').value,
      output: $('output').value,
    });
    approval = null;
    showCompiled();
    setStatus('Manifest compiled. Review the steps and diff before approving.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

$('approve').addEventListener('click', async () => {
  if (!compiled) return;
  try {
    approval = await createApproval(compiled.manifestHash);
    $('approval-state').textContent = `Approved locally until ${new Date(approval.expiresAt).toLocaleTimeString()}.`;
    $('run').disabled = false;
    setStatus('Exact manifest approved. Safe local execution is ready.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

$('run').addEventListener('click', () => {
  try {
    const result = runSafePipeline($('source').value, compiled, approval);
    const page = addBlock(parseLogseqPage($('notes').value || '# Automation output\n'), `Automation result: ${result.text || '(empty)'}`, { source: 'local-preview', status: result.status });
    const markdown = serializeLogseqPage(page);
    $('result').textContent = JSON.stringify(result, null, 2);
    $('output-notes').value = markdown;
    setStatus('Safe local run complete. No generated code or network request was executed.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('output-notes').value);
    setStatus('Markdown copied to the clipboard.');
  } catch {
    setStatus('Clipboard access is unavailable; select the Markdown output instead.', 'warn');
  }
});

$('download').addEventListener('click', () => {
  const blob = new Blob([$('output-notes').value], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'orin-automation-notes.md';
  link.click();
  URL.revokeObjectURL(url);
});
