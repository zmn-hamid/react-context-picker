chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["picker.js"],
      world: "MAIN"
    });
  } catch (error) {
    // Chrome blocks script injection on internal pages and the Web Store.
    console.warn("React Context Picker could not start on this page:", error);
  }
});
