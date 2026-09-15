// popup.js — handles saving/loading settings and triggering autofill

const FIELDS = [
  "artistName", "recordLabel", "language",
  "primaryGenre", "secondaryGenre",
  "swFirst", "swMiddle", "swLast",
  "performerName", "performerRole",
  "producerName", "producerRole"
];
const RADIOS = ["explicit", "instrumental", "aiGenerated"];
const CHECKBOXES = [];

function getFormValues() {
  const data = {};
  FIELDS.forEach(id => {
    data[id] = document.getElementById(id).value;
  });
  RADIOS.forEach(name => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    data[name] = checked ? checked.value : null;
  });
  CHECKBOXES.forEach(id => {
    data[id] = document.getElementById(id).checked;
  });
  return data;
}

function applyFormValues(data) {
  if (!data) return;
  FIELDS.forEach(id => {
    if (data[id] !== undefined) document.getElementById(id).value = data[id];
  });
  RADIOS.forEach(name => {
    if (data[name]) {
      const radio = document.querySelector(`input[name="${name}"][value="${data[name]}"]`);
      if (radio) radio.checked = true;
    }
  });
  CHECKBOXES.forEach(id => {
    if (data[id] !== undefined) document.getElementById(id).checked = data[id];
  });
}

function showStatus(msg, color = "#1db954") {
  const el = document.getElementById("status");
  el.style.color = color;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2500);
}

// Load saved settings on popup open
chrome.storage.sync.get("dkDefaults", (result) => {
  if (result.dkDefaults) applyFormValues(result.dkDefaults);
});

// Save button
document.getElementById("saveBtn").addEventListener("click", () => {
  const data = getFormValues();
  chrome.storage.sync.set({ dkDefaults: data }, () => {
    showStatus("✓ Defaults saved!");
  });
});

// Fill button — triggers content script on active tab
document.getElementById("fillBtn").addEventListener("click", () => {
  const data = getFormValues();
  // Save first, then inject
  chrome.storage.sync.set({ dkDefaults: data }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes("distrokid.com")) {
        showStatus("⚠ Open a DistroKid upload page first.", "#e3372d");
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["content.js"]
        },
        () => {
          // After injecting, send fill message
          chrome.tabs.sendMessage(tab.id, { action: "fill", data }, (response) => {
            if (chrome.runtime.lastError) {
              // content script already injected, just send message
              chrome.tabs.sendMessage(tab.id, { action: "fill", data });
            }
            showStatus("⚡ Form filled!");
          });
        }
      );
    });
  });
});
