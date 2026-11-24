# React Context Picker

A local-only Chrome extension for reviewing and copying context about an element on a React page. It makes no network requests.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select this directory.
3. Open or reload your local React development page, then pin the extension if desired.

## Use

Click the extension icon, hover to highlight an element, and click to select it. The picker blocks the selection click and automatically copies the result to your clipboard, then briefly confirms the copy and closes. Press **Escape** to cancel. If copying fails, select the displayed result and copy it manually, then press **Escape** to close it. Click the icon again to close an active picker.

For the most reliable component identification, the picker first looks for a `data-design-source` attribute on the selected element. If present and non-empty, it copies the attribute's value, the element's tag name, and—when available—the element's `id`, all on one compact line. If the attribute is missing, the picker falls back to a report containing a query-free URL, DOM selector, element type, classes, visible text excerpt, and any React component names and source hints exposed by the page. If report generation also fails, it copies `<failed to find the component>`. Input, textarea, select and editable content values are not read. React metadata is best-effort and can be absent, especially in production builds or newer React versions; unavailable information is labeled rather than inferred. Selectors and source hints may change between builds. Review copied content for sensitive information before sharing it.

### Add `data-design-source` to your website

To make the extension more reliable, instrument your site to add a `data-design-source` attribute to the DOM elements you want to identify. The attribute value should be useful source information, such as the file and component declaration location. Because the picker copies the value as-is, choose a format that works for your workflow and avoid putting secrets in it.

For example, in our Vite + React project, a Vite transform parses each TSX file and automatically adds `data-design-source="file#Component#line:column"` to JSX elements. The attribute identifies where the element was declared without adding or changing HTML IDs. You can implement a similar transform (or another build-time instrumentation step) in your own project. Without this attribute, the extension continues to use its standard report as a fallback.

The extension uses `activeTab` and `scripting` only; it injects on explicit icon click into the current tab's main frame to access React's page-owned internals. Chrome restricts injection on browser pages and the Web Store. Cross-origin frames and shadow-root internals are not inspected. Pages can observe or interfere with injected code and may have earlier event listeners that run before the picker.

## Tests

Run `node --test tests/*.test.js` with a recent Node.js installation. For a browser smoke test, load the extension, select an element on a local React page, check that the confirmation disappears and paste the clipboard contents, then repeat and cancel with Escape.
