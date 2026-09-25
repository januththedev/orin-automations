const ID_RE = /\{\{id::\s*([A-Za-z0-9_-]+)\s*\}\}/i;
const PROPERTY_RE = /^([A-Za-z][A-Za-z0-9_-]*)\s*::\s*(.*)$/;

function stableId(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `b-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function parseInline(content, block) {
  let value = content;
  const id = value.match(ID_RE);
  if (id) { block.id = id[1]; value = value.replace(ID_RE, '').trim(); }
  block.tags = [...new Set([...value.matchAll(/(^|\s)#([A-Za-z0-9_/-]+)/g)].map((match) => match[2]))];
  value = value.replace(/\s+#([A-Za-z0-9_/-]+)/g, '').trim();
  const properties = [...value.matchAll(/(?:^|\s)([A-Za-z][A-Za-z0-9_-]*)\s*::\s*([^]+?)(?=\s+[A-Za-z][A-Za-z0-9_-]*\s*::|$)/g)];
  for (const match of properties) block.properties[match[1]] = match[2].trim();
  if (properties.length) {
    for (const match of properties) value = value.replace(match[0], ' ');
    value = value.replace(/\s+/g, ' ').trim();
  }
  block.content = value;
}

function parseBlocks(lines, start = 0, depth = 0) {
  const blocks = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)-\s+(.*)$/);
    if (!match) { i += 1; continue; }
    const indent = match[1].replace(/\t/g, '  ').length;
    if (indent < depth * 2) break;
    if (indent > depth * 2) { i += 1; continue; }
    const block = { id: '', content: '', tags: [], properties: {}, children: [] };
    parseInline(match[2], block);
    if (!block.id) block.id = stableId(`${depth}:${line}`);
    i += 1;
    while (i < lines.length) {
      const property = lines[i].match(/^\s+([A-Za-z][A-Za-z0-9_-]*)\s*::\s*(.*)$/);
      if (!property) break;
      block.properties[property[1]] = property[2].trim();
      i += 1;
    }
    const child = parseBlocks(lines, i, depth + 1);
    block.children = child.blocks;
    i = child.index;
    blocks.push(block);
  }
  return { blocks, index: i };
}

export function parseLogseqPage(markdown) {
  const text = String(markdown || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const titleLine = lines.find((line) => /^#\s+/.test(line)) || '';
  const title = titleLine.replace(/^#\s+/, '').trim() || 'Untitled';
  const pageProperties = {};
  const firstBlock = lines.findIndex((line) => /^\s*-\s+/.test(line));
  for (const line of lines.slice(0, firstBlock < 0 ? lines.length : firstBlock)) {
    const property = line.match(PROPERTY_RE);
    if (property) pageProperties[property[1]] = property[2].trim();
  }
  const body = firstBlock < 0 ? [] : lines.slice(firstBlock);
  return { title, properties: pageProperties, blocks: parseBlocks(body).blocks };
}

function renderBlock(block, depth = 0) {
  const indent = '  '.repeat(depth);
  const tags = block.tags?.length ? ` ${block.tags.map((tag) => `#${tag}`).join(' ')}` : '';
  const id = block.id || stableId(`${depth}:${block.content}`);
  const lines = [`${indent}- ${block.content || '(empty)'}${tags} {{id:: ${id}}}`];
  for (const [key, value] of Object.entries(block.properties || {})) lines.push(`${indent}  ${key}:: ${value}`);
  for (const child of block.children || []) lines.push(...renderBlock(child, depth + 1));
  return lines;
}

export function serializeLogseqPage(page) {
  const properties = Object.entries(page.properties || {}).map(([key, value]) => `${key}:: ${value}`);
  const blocks = (page.blocks || []).flatMap((block) => renderBlock(block));
  return [`# ${page.title || 'Untitled'}`, ...(properties.length ? ['', ...properties] : []), '', ...blocks, ''].join('\n');
}

export function addBlock(page, content, properties = {}) {
  const block = { id: stableId(`${page.title}:${content}:${page.blocks.length}`), content: String(content || '').trim(), tags: [], properties, children: [] };
  if (!block.content) throw new Error('Block content is required.');
  return { ...page, blocks: [...(page.blocks || []), block] };
}
