import test from 'node:test';
import assert from 'node:assert/strict';
import { addBlock, parseLogseqPage, serializeLogseqPage } from '../lib/notes.mjs';

const source = `# Research\n\nowner:: Januth\ntags:: orin, notes\n\n- First finding {{id:: block-001}} #weather\n  source:: https://example.com\n- Second finding\n  - Nested detail {{id:: block-002}}\n`;

test('Logseq page parser preserves IDs, properties, tags, and nesting', () => {
  const page = parseLogseqPage(source);
  assert.equal(page.title, 'Research');
  assert.equal(page.properties.owner, 'Januth');
  assert.equal(page.blocks[0].id, 'block-001');
  assert.deepEqual(page.blocks[0].tags, ['weather']);
  assert.equal(page.blocks[0].properties.source, 'https://example.com');
  assert.equal(page.blocks[1].children[0].id, 'block-002');
});

test('Logseq serializer round-trips stable block IDs and properties', () => {
  const page = parseLogseqPage(source);
  const serialized = serializeLogseqPage(page);
  const roundTrip = parseLogseqPage(serialized);
  assert.equal(roundTrip.title, page.title);
  assert.deepEqual(roundTrip.properties, page.properties);
  assert.deepEqual(roundTrip.blocks.map((block) => block.id), page.blocks.map((block) => block.id));
  assert.equal(roundTrip.blocks[1].children[0].content, 'Nested detail');
});

test('new blocks receive deterministic IDs', () => {
  const page = addBlock(parseLogseqPage('# Notes\n'), 'Generated output', { source: 'local' });
  const again = addBlock(parseLogseqPage('# Notes\n'), 'Generated output', { source: 'local' });
  assert.equal(page.blocks[0].id, again.blocks[0].id);
  assert.match(serializeLogseqPage(page), /\{\{id:: b-[a-f0-9]{8}\}\}/);
});
