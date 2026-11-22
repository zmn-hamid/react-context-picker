# React Context Picker

A local-only Chrome extension for reviewing and copying context about an element on a React page. It makes no network requests.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select this directory.
3. Open or reload your local React development page, then pin the extension if desired.

## Use

Click the extension icon, hover to highlight an element, and click to select it. The picker blocks the selection click and automatically copies the report to your clipboard; press **Escape** or **Cancel** to stop. If copying fails, select the displayed report and copy it manually. Click the icon again to close an active picker.

The report includes a query-free URL, DOM selector, element type, classes, visible text excerpt, and any React component names and source hints exposed by the page. Input, textarea, select and editable content values are not read. React metadata is best-effort and can be absent, especially in production builds or newer React versions; unavailable information is labeled rather than inferred. Selectors and source hints may change between builds. Review the report for sensitive page content before sharing it.

The extension uses `activeTab` and `scripting` only; it injects on explicit icon click into the current tab's main frame to access React's page-owned internals. Chrome restricts injection on browser pages and the Web Store. Cross-origin frames and shadow-root internals are not inspected. Pages can observe or interfere with injected code and may have earlier event listeners that run before the picker.

## Tests

Run `node --test tests/*.test.js` with a recent Node.js installation. For a browser smoke test, load the extension, select an element on a local React page, check the report and paste the clipboard contents, then repeat and cancel with Escape.
