const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

const { mapSources } = load('core/imageSync.ts');
const remote = 'https://example.com/image.webp?alt=media&token=a%26b&size=2';
const original = 'data:image/webp;base64,YWJj';

test('mapSources decodes only the actual img src once and leaves other markup verbatim', () => {
  const encoded = remote.replace('&token', '&#38;token').replace('&size', '&amp;size');
  const prefix = `<p>${encoded} &lt;img src="${encoded}"&gt;</p>` +
    `<!-- <img src="${encoded}"> --><textarea><img src="${encoded}"></textarea>` +
    `<div title="<img src='${encoded}'>"></div><source src="${encoded}">`;
  const unchanged = `<img src="${encoded.replace('&amp;size', '&amp;amp;size')}">`;
  const input = `${prefix}<IMG data-src="${encoded}" SRC = '${encoded}' alt="a > b">${unchanged}`;
  const expected = `${prefix}<IMG data-src="${encoded}" SRC = '${original}' alt="a > b">${unchanged}`;

  assert.equal(mapSources(input, source => source === remote ? original : source), expected);
});

test('mapSources preserves the quote style and escapes new attribute values', () => {
  const input = `<img src = '${original}'/><img src=${original} alt="unchanged">`;
  const replacement = `${remote}&label=<a>'"`;
  const escaped = `${remote.replaceAll('&', '&amp;')}&amp;label=&lt;a&gt;`;
  const mapped = mapSources(input, () => replacement);
  assert.equal(mapped, `<img src = '${escaped}&#39;"'/><img src="${escaped}'&quot;" alt="unchanged">`);
  assert.equal(mapSources(mapped, value => {
    assert.equal(value, replacement);
    return value;
  }), mapped);
});
