const test = require('node:test');
const assert = require('node:assert/strict');
const { start, copyText, reportFor } = require('../picker.js');
global.CSS = { escape: x => x };
global.getComputedStyle = () => ({ display: 'block', visibility: 'visible' });

class Element {
  constructor(tag) { this.localName = tag; this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = []; this.childNodes = []; this.style = {}; this.listeners = {}; this.className = ''; this.id = ''; }
  append(...children) { for (const c of children) { this.children.push(c); this.childNodes.push(c); c.parentElement = this; } }
  appendChild(c) { this.append(c); }
  replaceChildren(...children) { this.children = []; this.childNodes = []; this.append(...children); }
  setAttribute() {}
  getAttribute() { return null; }
  attachShadow() { return this.shadow = new Element('shadow'); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  remove() { this.removed = true; }
  focus() {}
  select() { this.selected = true; }
  getBoundingClientRect() { return { left: 1, top: 2, width: 30, height: 40 }; }
}
function setup() {
  const listeners = {};
  const doc = { documentElement: new Element('html'), body: new Element('body'), createElement: tag => new Element(tag),
    addEventListener: (type, fn) => { listeners[type] = fn; }, removeEventListener: type => { delete listeners[type]; } };
  doc.documentElement.append(doc.body);
  const win = { location: { href: 'http://localhost:3000/path?secret=x' }, navigator: {} };
  start(doc, win);
  const host = doc.documentElement.children.at(-1);
  function event(type, target, extra = {}) {
    const e = { type, target, composedPath: () => [target], preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
    listeners[type]?.(e); return e;
  }
  return { doc, win, host, listeners, event };
}

test('hover highlights, click suppresses action and displays review report', () => {
  const { doc, host, event } = setup();
  const button = new Element('button'); button.childNodes.push({ nodeType: 3, nodeValue: 'Save' }); doc.body.append(button);
  event('pointermove', button);
  assert.equal(host.shadow.children[1].hidden, false);
  assert.equal(event('mousedown', button).prevented, true);
  const click = event('click', button);
  assert.equal(click.prevented, true); assert.equal(click.stopped, true);
  const panel = host.shadow.children[2];
  assert.equal(panel.children[0].textContent, 'Element context');
  assert.match(panel.children[2].value, /Visible text: Save/);
  assert.equal(panel.children[3].textContent, 'Copy');
});

test('Escape cancels and removes listeners', () => {
  const { host, listeners, event, win } = setup();
  assert.equal(event('keydown', host, { key: 'Escape' }).prevented, true);
  assert.equal(host.removed, true); assert.equal(listeners.click, undefined);
  assert.equal(win.__reactContextPicker__, undefined);
});

test('clipboard fallback is used when API fails', async () => {
  const doc = { body: new Element('body'), createElement: tag => new Element(tag), execCommand: command => command === 'copy' };
  assert.equal(await copyText('report', doc, { writeText: async () => { throw Error('denied'); } }), true);
  assert.equal(doc.body.children[0].value, 'report'); assert.equal(doc.body.children[0].removed, true);
  doc.execCommand = () => false;
  assert.equal(await copyText('report', doc, null), false);
});

test('missing React metadata is explicit, URL query and input values omitted', () => {
  const el = new Element('div');
  const input = new Element('textarea'); input.value = 'private'; input.childNodes.push({ nodeType: 3, nodeValue: 'default secret' }); el.append(input);
  const report = reportFor(el, 'http://localhost:3000/test?token=secret');
  assert.match(report, /React components \(nearest first\): \(unavailable\)/);
  assert.match(report, /React source hints: \(unavailable\)/);
  assert.doesNotMatch(report, /secret|private|token/);
});
