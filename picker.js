(() => {
  'use strict';

  const KEY = '__reactContextPicker__';
  const isControl = (el) => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName) || el.isContentEditable;

  function selectorFor(el) {
    const parts = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      let part = node.localName;
      if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
      const siblings = node.parentElement ? Array.from(node.parentElement.children).filter(x => x.localName === node.localName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      parts.unshift(part);
    }
    return parts.join(' > ');
  }

  function visibleText(el) {
    const pieces = [];
    function visit(node) {
      if (pieces.join(' ').length > 300) return;
      if (node.nodeType === 3) { pieces.push(node.nodeValue); return; }
      if (node.nodeType !== 1 || isControl(node)) return;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || node.hidden) return;
      for (const child of node.childNodes) visit(child);
    }
    visit(el);
    const text = pieces.join(' ').replace(/\s+/g, ' ').trim();
    return text.length > 200 ? text.slice(0, 197) + '...' : text;
  }

  function reactInfo(el) {
    let fiber;
    for (let node = el; node && !fiber; node = node.parentElement) {
      const key = Object.keys(node).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (key) fiber = node[key];
    }
    const names = [], sources = [], seen = new Set();
    for (let count = 0; fiber && count < 100 && !seen.has(fiber); count++, fiber = fiber.return) {
      seen.add(fiber);
      const type = fiber.elementType || fiber.type;
      const name = typeof type === 'function' ? (type.displayName || type.name) :
        (type && typeof type === 'object' ? (type.displayName || type.render?.displayName || type.render?.name) : '');
      if (name && !names.includes(name)) names.push(name);
      const source = fiber._debugSource || type?._debugSource;
      if (source && typeof source.fileName === 'string') {
        const hint = source.fileName + (source.lineNumber ? ':' + source.lineNumber : '') + (source.columnNumber ? ':' + source.columnNumber : '');
        if (!sources.includes(hint)) sources.push(hint);
      }
    }
    return { names, sources };
  }

  function reportFor(el, href) {
    const url = new URL(href); url.search = '';
    const react = reactInfo(el);
    const classes = typeof el.className === 'string' ? el.className.trim() : (el.getAttribute('class') || '').trim();
    return [
      'Page URL: ' + url.href,
      'DOM selector: ' + selectorFor(el),
      'Element type: ' + el.localName,
      'Classes: ' + (classes || '(none)'),
      'Visible text: ' + (visibleText(el) || '(none)'),
      'React components (nearest first): ' + (react.names.join(' → ') || '(unavailable)'),
      'React source hints: ' + (react.sources.join(', ') || '(unavailable)')
    ].join('\n');
  }

  async function copyText(text, doc, clipboard) {
    try {
      if (!clipboard || !clipboard.writeText) throw new Error('Clipboard API unavailable');
      await clipboard.writeText(text);
      return true;
    } catch (_) {
      const field = doc.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-10000px;top:0';
      doc.body.appendChild(field);
      field.select();
      let copied = false;
      try { copied = doc.execCommand('copy'); } catch (_) { /* manual copy remains available */ }
      field.remove();
      return copied;
    }
  }

  function start(doc, win) {
    if (win[KEY]) { win[KEY](); return; }
    const host = doc.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = doc.createElement('style');
    style.textContent = ':host{all:initial} *{box-sizing:border-box} .outline{position:fixed;border:2px solid #2563eb;background:rgba(37,99,235,.12);pointer-events:none} .panel{pointer-events:auto;position:fixed;right:16px;bottom:16px;width:min(460px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:white;color:#111827;border:1px solid #9ca3af;border-radius:8px;box-shadow:0 4px 25px #0005;padding:14px;font:14px/1.4 system-ui,sans-serif} h2{font-size:16px;margin:0 0 8px} p{margin:6px 0} textarea{width:100%;height:190px;resize:vertical;font:12px/1.4 monospace} button{font:inherit;cursor:pointer;margin:8px 8px 0 0;padding:6px 12px}';
    const outline = doc.createElement('div'); outline.className = 'outline'; outline.hidden = true;
    const panel = doc.createElement('section'); panel.className = 'panel'; panel.setAttribute('aria-label', 'React Context Picker');
    const heading = doc.createElement('h2'); heading.textContent = 'Select an element';
    const message = doc.createElement('p'); message.textContent = 'Hover to highlight, click to select, or press Escape to cancel.';
    panel.append(heading, message); shadow.append(style, outline, panel); doc.documentElement.appendChild(host);
    let selecting = true, closed = false, timer;
    const eventTypes = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    function inside(event) { return event.composedPath().includes(host); }
    function move(event) {
      if (!selecting || inside(event) || !event.target.getBoundingClientRect) { outline.hidden = true; return; }
      const r = event.target.getBoundingClientRect();
      outline.hidden = false;
      Object.assign(outline.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    }
    function intercept(event) {
      if (!selecting || inside(event)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.type === 'click') showReport(event.target);
    }
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cleanup(); }
    }
    function cleanup() {
      closed = true;
      if (timer) win.clearTimeout(timer);
      doc.removeEventListener('pointermove', move, true);
      for (const type of eventTypes) doc.removeEventListener(type, intercept, true);
      doc.removeEventListener('keydown', keydown, true);
      host.remove(); delete win[KEY];
    }
    function showReport(el) {
      selecting = false; outline.hidden = true;
      const report = reportFor(el, win.location.href);
      heading.textContent = 'Copying…';
      panel.replaceChildren(heading);
      copyText(report, doc, win.navigator.clipboard).then(copied => {
        if (closed) return;
        if (copied) {
          heading.textContent = 'Copied to clipboard.';
          panel.setAttribute('role', 'status');
          timer = win.setTimeout(cleanup, 2000);
        } else {
          heading.textContent = 'Copy failed';
          message.textContent = 'Select the report and copy it manually. Press Escape to close.';
          const field = doc.createElement('textarea'); field.value = report; field.setAttribute('aria-label', 'Report'); field.setAttribute('readonly', '');
          panel.replaceChildren(heading, message, field);
          field.focus();
        }
      });
    }
    doc.addEventListener('pointermove', move, true);
    for (const type of eventTypes) doc.addEventListener(type, intercept, true);
    doc.addEventListener('keydown', keydown, true);
    win[KEY] = cleanup;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { selectorFor, visibleText, reactInfo, reportFor, copyText, start };
  else start(document, window);
})();
