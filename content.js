// content.js - DistroKid AutoFill content script
// Fills repetitive form fields using saved defaults.

// --- Helpers -----------------------------------------------------------------

/**
 * Set a native input/select value and fire the React/Vue synthetic events
 * so the framework registers the change.
 */
function setNativeValue(el, value) {
  if (!el) return false;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype,
    "value"
  );
  if (nativeInputValueSetter) {
    nativeInputValueSetter.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/**
 * Click a radio/checkbox only if it isn't already in the desired state.
 */
function setChecked(el, desired) {
  if (!el) return;
  if (el.checked !== desired) el.click();
}

/**
 * Find a <select> whose visible label text contains `labelText` (case-insensitive)
 * and set its value.
 */
function fillSelectByLabel(labelText, value) {
  const labels = document.querySelectorAll("label, td, th, div");
  for (const label of labels) {
    if (label.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
      let sel = label.querySelector("select") ||
                label.nextElementSibling?.querySelector("select") ||
                label.nextElementSibling;
      if (sel && sel.tagName === "SELECT") {
        return setSelectValue(sel, value);
      }
    }
  }
  return false;
}

/**
 * Set a <select> to the option whose text matches value (case-insensitive).
 * Falls back to setting by option value attribute.
 */
function setSelectValue(sel, value) {
  if (!sel || !value) return false;
  const lower = value.toLowerCase();
  for (const opt of sel.options) {
    if (opt.text.toLowerCase() === lower || opt.value.toLowerCase() === lower) {
      setNativeValue(sel, opt.value);
      return true;
    }
  }
  return false;
}

/**
 * Find a radio button whose nearby label text matches and click it.
 */
function clickRadioByLabel(labelText) {
  const allLabels = document.querySelectorAll("label");
  for (const lbl of allLabels) {
    if (lbl.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
      const radio = lbl.querySelector("input[type='radio']") ||
                    document.getElementById(lbl.htmlFor);
      if (radio) { radio.click(); return true; }
    }
  }
  // Also try: radio whose value attribute matches
  const radios = document.querySelectorAll("input[type='radio']");
  for (const r of radios) {
    if (r.value.toLowerCase().includes(labelText.toLowerCase())) {
      r.click(); return true;
    }
  }
  return false;
}

/**
 * Find a checkbox whose nearby label text contains `labelText`.
 */
function findCheckboxByLabel(labelText) {
  const allLabels = document.querySelectorAll("label");
  for (const lbl of allLabels) {
    if (lbl.textContent.toLowerCase().includes(labelText.toLowerCase())) {
      const cb = lbl.querySelector("input[type='checkbox']") ||
                 document.getElementById(lbl.htmlFor);
      if (cb) return cb;
    }
  }
  return null;
}

// --- Field Fillers -----------------------------------------------------------

function fillArtistName(name) {
  if (!name) return;
  const candidates = [
    ...document.querySelectorAll("input[name='artist_name']"),
    ...document.querySelectorAll("input[placeholder*='artist' i]"),
    ...document.querySelectorAll("input[id*='artist' i]"),
  ];
  for (const el of candidates) {
    if (el.type === "text" || el.type === "") {
      setNativeValue(el, name);
      return;
    }
  }
}

function fillRecordLabel(label) {
  if (!label) return;
  const candidates = [
    ...document.querySelectorAll("input[name*='label' i]"),
    ...document.querySelectorAll("input[id*='label' i]"),
    ...document.querySelectorAll("input[placeholder*='label' i]"),
  ];
  for (const el of candidates) {
    if (el.type === "text" || el.type === "") {
      setNativeValue(el, label);
      return;
    }
  }
}

function fillLanguage(lang) {
  if (!lang) return;
  const sels = [
    ...document.querySelectorAll("select[name*='language' i]"),
    ...document.querySelectorAll("select[id*='language' i]"),
  ];
  for (const sel of sels) {
    if (setSelectValue(sel, lang)) return;
  }
  fillSelectByLabel("language", lang);
}

function fillGenre(primary, secondary) {
  const genreSels = document.querySelectorAll("select[name*='genre' i], select[id*='genre' i]");
  const list = Array.from(genreSels);
  if (primary && list[0]) setSelectValue(list[0], primary);
  if (secondary && list[1]) setSelectValue(list[1], secondary);
  if (primary) fillSelectByLabel("primary genre", primary);
  if (secondary) fillSelectByLabel("secondary genre", secondary);
}

function fillSongwriter(first, middle, last) {
  const firstInputs = document.querySelectorAll(
    "input[name*='songwriter_first' i], input[id*='songwriter_first' i], input[placeholder*='first name' i]"
  );
  const middleInputs = document.querySelectorAll(
    "input[name*='songwriter_middle' i], input[id*='songwriter_middle' i], input[placeholder*='middle' i]"
  );
  const lastInputs = document.querySelectorAll(
    "input[name*='songwriter_last' i], input[id*='songwriter_last' i], input[placeholder*='last name' i]"
  );

  if (first && firstInputs.length) setNativeValue(firstInputs[0], first);
  if (middle && middleInputs.length) setNativeValue(middleInputs[0], middle);
  if (last && lastInputs.length) setNativeValue(lastInputs[0], last);
}

function fillExplicit(value) {
  if (!value) return;
  const allInputs = document.querySelectorAll("input[type='radio']");
  for (const inp of allInputs) {
    const lbl = document.querySelector(`label[for="${inp.id}"]`) ||
                inp.closest("label");
    const text = (lbl?.textContent || inp.value || "").toLowerCase();
    if (value === "yes" && (text.includes("yes") || inp.value.toLowerCase().includes("yes")) &&
        inp.closest("*")?.textContent.toLowerCase().includes("explicit")) {
      inp.click(); return;
    }
    if (value === "no" && (text.includes("no") || inp.value.toLowerCase().includes("no")) &&
        inp.closest("*")?.textContent.toLowerCase().includes("explicit")) {
      inp.click(); return;
    }
  }
  const target = document.querySelector(
    `input[type="radio"][name*="explicit" i][value="${value}"]`
  );
  if (target) target.click();
}

function fillInstrumental(value) {
  if (!value) return;
  const target = document.querySelector(
    `input[type="radio"][name*="instrumental" i][value="${value}"]`
  ) || document.querySelector(
    `input[type="radio"][id*="instrumental" i][value="${value}"]`
  );
  if (target) { target.click(); return; }
  if (value === "yes") clickRadioByLabel("instrumental and contains no lyrics");
  else clickRadioByLabel("contains lyrics");
}

function fillAiGenerated(value) {
  if (!value) return;
  const target = document.querySelector(
    `input[type="radio"][name*="ai" i][value="${value}"]`
  );
  if (target) { target.click(); return; }
  if (value === "yes") clickRadioByLabel("Yes");
  else clickRadioByLabel("No");
}

function fillInstagramFacebook() {
  const radios = document.querySelectorAll("input[type='radio']");
  for (const r of radios) {
    const lbl = document.querySelector(`label[for="${r.id}"]`) || r.closest("label");
    const text = (lbl?.textContent || "").toLowerCase();
    if (text.includes("doesn't yet have a profile") || text.includes("does not yet have a profile")) {
      if (!r.checked) r.click();
    }
  }
}

/**
 * Fill Apple Music additional requirements:
 * at least one performer and one producer credit per song.
 */
function fillAppleMusicCredits(performerName, performerRole, producerName, producerRole) {
  if (!performerName && !producerName) return;

  const PERFORMER_ROLES = performerRole ? [performerRole.toLowerCase()] : ["singing & vocals", "vocal accompaniment", "background vocals"];
  const PRODUCER_ROLES  = producerRole  ? [producerRole.toLowerCase()]  : ["producer", "co-producer", "executive producer", "beat maker"];

  /**
   * Find only the Apple Music credit role <select> elements, in DOM order.
   * Identified by having options that match known credit role names.
   */
  function findRoleSelects() {
    const knownRoles = ["background vocals", "singing & vocals", "producer", "beat maker", "co-producer", "assistant producer", "vocal accompaniment"];
    return [...document.querySelectorAll("select")].filter(sel =>
      [...sel.options].some(o => knownRoles.includes(o.text.trim().toLowerCase()))
    );
  }

  /**
   * All inputs with placeholder="Name" in DOM order.
   */
  function findNameInputs() {
    return [...document.querySelectorAll("input[placeholder='Name']")];
  }

  function fillCredit(index, preferredRoles, nameValue) {
    if (!nameValue) return;

    const sel = findRoleSelects()[index];
    const inp = findNameInputs()[index];

    if (sel) {
      const options = [...sel.options];
      let best = null;
      for (const role of preferredRoles) {
        best = options.find(o => o.text.trim().toLowerCase() === role);
        if (best) break;
      }
      if (!best) {
        for (const role of preferredRoles) {
          best = options.find(o => o.text.trim().toLowerCase().startsWith(role));
          if (best) break;
        }
      }
      if (best) setNativeValue(sel, best.value);
    }

    setTimeout(() => {
      const nameInp = findNameInputs()[index];
      if (nameInp) { nameInp.focus(); setNativeValue(nameInp, nameValue); nameInp.blur(); }
    }, 300);
  }

  // Performer = index 0, Producer = index 1 (DOM order)
  fillCredit(0, PERFORMER_ROLES, performerName);
  setTimeout(() => fillCredit(1, PRODUCER_ROLES, producerName), 800);
}

// --- Main Fill Function ------------------------------------------------------

/**
 * Check all five mandatory agreement checkboxes at the bottom of the upload form.
 * These are always required before DistroKid will let you submit.
 *
 * Strategy: for every unchecked checkbox on the page, collect text from:
 *   1. Its own <label> (via for= or wrapping)
 *   2. All siblings of the checkbox (text nodes + elements)
 *   3. Parent element text
 *   4. Direct text nodes of grandparent only
 * Then match against known phrases from the actual checkbox labels.
 */
function fillMandatoryCheckboxes() {
  const phrases = [
    "youtube music",              // "I selected YouTube Music..."
    "capitali",                   // "Non-standard cApiTaliZatiOn detected..."
    "promo services",             // "I won't use promo services..."
    "authorized to sell",         // "I recorded this music, and am authorized to sell..."
    "not using any other artist", // "I'm not using any other artist's name..."
    "distribution agreement",     // "I have read and agree to the DistroKid Distribution Agreement"
  ];

  function getNeighbourText(cb) {
    const parts = [];

    // 1. Explicit <label for="id">
    if (cb.id) {
      const lbl = document.querySelector(`label[for="${cb.id}"]`);
      if (lbl) parts.push(lbl.textContent);
    }

    // 2. Wrapping <label>
    const wrappingLabel = cb.closest("label");
    if (wrappingLabel) parts.push(wrappingLabel.textContent);

    // 3. All sibling nodes (text + elements) within the same parent
    const parent = cb.parentElement;
    if (parent) {
      for (const node of parent.childNodes) {
        if (node !== cb) parts.push(node.textContent || "");
      }
      // 4. Direct text nodes of grandparent only (avoid pulling in the whole
      //    services/platform list which could contain "YouTube Music" etc.)
      if (parent.parentElement) {
        for (const node of parent.parentElement.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) parts.push(node.textContent);
        }
      }
    }

    return parts.join(" ").toLowerCase();
  }

  const allCheckboxes = document.querySelectorAll("input[type='checkbox']");
  for (const cb of allCheckboxes) {
    if (cb.checked) continue;

    // Never touch any checkbox inside the Services section
    let el = cb;
    let insideServicesSection = false;
    for (let i = 0; i < 10; i++) {
      el = el.parentElement;
      if (!el) break;
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join("");
      if (directText.toLowerCase().includes("services")) {
        insideServicesSection = true;
        break;
      }
      // Also catch a heading sibling that says "Services"
      const headings = el.querySelectorAll("h1,h2,h3,h4,h5,h6,b,strong");
      for (const h of headings) {
        if (h.textContent.trim().toLowerCase() === "services") {
          insideServicesSection = true;
          break;
        }
      }
      if (insideServicesSection) break;
    }
    if (insideServicesSection) continue;

    // Never touch the Social Media Pack checkbox
    let el2 = cb;
    let isSocialMediaPack = false;
    for (let i = 0; i < 6; i++) {
      el2 = el2.parentElement;
      if (!el2) break;
      if (el2.textContent.toLowerCase().includes("social media pack")) {
        isSocialMediaPack = true;
        break;
      }
    }
    if (isSocialMediaPack) continue;

    const text = getNeighbourText(cb);
    if (phrases.some(p => text.includes(p))) {
      cb.click();
    }
  }
}

function fillForm(data) {
  fillArtistName(data.artistName);
  fillRecordLabel(data.recordLabel);
  fillLanguage(data.language);
  fillGenre(data.primaryGenre, data.secondaryGenre);
  fillSongwriter(data.swFirst, data.swMiddle, data.swLast);
  fillExplicit(data.explicit);
  fillInstrumental(data.instrumental);
  fillAiGenerated(data.aiGenerated);
  fillInstagramFacebook();
  // Apple Music credits: use artist name as performer, producer field if set
  fillAppleMusicCredits(data.performerName || "", data.performerRole || "", data.producerName || "", data.producerRole || "");
  // Always tick the mandatory agreement checkboxes
  fillMandatoryCheckboxes();

  showBanner("DistroKid AutoFill applied!");
}

function showBanner(message) {
  const existing = document.getElementById("dk-autofill-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "dk-autofill-banner";
  banner.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 99999;
    background: #1db954; color: #fff;
    padding: 10px 18px; border-radius: 8px;
    font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    font-size: 14px; font-weight: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    transition: opacity 0.4s;
  `;
  banner.textContent = message;
  document.body.appendChild(banner);

  setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 400);
  }, 3000);
}

// --- Modal Auto-Dismisser ----------------------------------------------------

/**
 * When DistroKid shows the "Social Media Pack Eligibility Requirements" modal
 * (or any similar confirmation dialog), automatically:
 *   1. Check the "Yes, I understand and confirm" checkbox
 *   2. Select the first radio option
 *   3. Click the "Continue" button
 */
function handleEligibilityModal(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const text = node.textContent || "";
  const isEligibilityModal = (
    text.includes("Eligibility Requirements") ||
    text.includes("I understand and confirm that all of the above are true") ||
    text.includes("Social Media Pack Eligibility")
  );
  if (!isEligibilityModal) return;

  setTimeout(() => {
    // Dismiss by clicking Cancel — clicking Continue would confirm and enable
    // the Social Media Pack, which we want left untouched.
    const buttons = node.querySelectorAll("button, input[type='button'], input[type='submit']");
    for (const btn of buttons) {
      const label = (btn.textContent || btn.value || "").trim().toLowerCase();
      if (label === "cancel") {
        btn.click();
        return;
      }
    }
  }, 120);
}

// --- Message Listener --------------------------------------------------------

// Prevent duplicate listener registration if script is injected multiple times
if (!window.__dkAutofillListenerSet) {
  window.__dkAutofillListenerSet = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "fill" && msg.data) {
      fillForm(msg.data);
      sendResponse({ ok: true });
    }
  });

  // Auto-fill on page load if setting is enabled
  chrome.storage.sync.get("dkDefaults", (result) => {
    if (result.dkDefaults && result.dkDefaults.autoFillOnLoad) {
      setTimeout(() => fillForm(result.dkDefaults), 1200);
    }
  });

  // Watch for dynamically injected modals
  const modalObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        handleEligibilityModal(node);
        if (node.nodeType === Node.ELEMENT_NODE) {
          node.querySelectorAll("*").forEach(handleEligibilityModal);
        }
      }
    }
  });

  modalObserver.observe(document.body, { childList: true, subtree: true });
}
