// QuickReply AI — Background Service Worker
// Handles extension lifecycle and messaging between popup and content scripts

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('QuickReply AI installed successfully.');
  }
});

// Relay messages between popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getEmailContent') {
    // Forward request to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractEmail' }, (response) => {
          sendResponse(response || { error: 'Could not extract email content.' });
        });
      } else {
        sendResponse({ error: 'No active tab found.' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === 'insertReply') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'insertReply',
          text: message.text
        }, (response) => {
          sendResponse(response || { success: false });
        });
      }
    });
    return true;
  }
});
