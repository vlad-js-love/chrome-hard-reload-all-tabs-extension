const btn          = document.getElementById("reloadBtn");
const btnLabel     = document.getElementById("btnLabel");
const btnIcon      = document.getElementById("btnIcon");
const status       = document.getElementById("status");
const progressFill = document.getElementById("progressFill");
const tabCountEl   = document.getElementById("tabCount");
const winCountEl   = document.getElementById("windowCount");
const lastCountEl  = document.getElementById("lastCount");

// ── Delay toggle ──────────────────────────────────
const delayToggle  = document.getElementById("delayToggle");
const delayPanel   = document.getElementById("delayPanel");
const delaySlider  = document.getElementById("delaySlider");
const delayDisplay = document.getElementById("delayDisplay");
const presetBtns   = document.querySelectorAll(".preset-btn");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDelay() {
  return delayToggle.checked ? parseInt(delaySlider.value, 10) : 0;
}

function updateDelayDisplay(val) {
  delayDisplay.textContent = val >= 1000 ? (val / 1000) + "s" : val + " ms";
}

function updatePresets(val) {
  presetBtns.forEach(b => b.classList.toggle("active", parseInt(b.dataset.val) === val));
}

// Init from localStorage
(function initDelay() {
  const saved = localStorage.getItem("delayEnabled") === "true";
  const savedVal = parseInt(localStorage.getItem("delayMs") || "100", 10);
  delayToggle.checked = saved;
  delaySlider.value = savedVal;
  updateDelayDisplay(savedVal);
  updatePresets(savedVal);
  if (saved) delayPanel.classList.add("visible");
})();

document.getElementById("delayLabel").addEventListener("click", e => e.stopPropagation());

delayToggle.addEventListener("change", () => {
  delayPanel.classList.toggle("visible", delayToggle.checked);
  localStorage.setItem("delayEnabled", delayToggle.checked);
});

delaySlider.addEventListener("input", () => {
  const val = parseInt(delaySlider.value, 10);
  updateDelayDisplay(val);
  updatePresets(val);
  localStorage.setItem("delayMs", val);
});

presetBtns.forEach(b => {
  b.addEventListener("click", () => {
    const val = parseInt(b.dataset.val, 10);
    delaySlider.value = val;
    updateDelayDisplay(val);
    updatePresets(val);
    localStorage.setItem("delayMs", val);
  });
});

// ── Excluded sites ────────────────────────────────
const exclHeader = document.getElementById("exclHeader");
const exclPanel  = document.getElementById("exclPanel");
const exclForm   = document.getElementById("exclForm");
const exclInput  = document.getElementById("exclInput");
const exclList   = document.getElementById("exclList");
const exclCount  = document.getElementById("exclCount");

let exclusions = loadExclusions();

function loadExclusions() {
  try {
    const saved = JSON.parse(localStorage.getItem("exclusions") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (_) {
    return [];
  }
}

function saveExclusions() {
  localStorage.setItem("exclusions", JSON.stringify(exclusions));
}

function matchesPattern(url, pattern) {
  url = url.toLowerCase();
  pattern = pattern.toLowerCase();
  if (pattern.includes("://")) return url.startsWith(pattern);

  // No scheme → domain (+ optional path), subdomains included
  try {
    const { host, pathname, search } = new URL(url);
    const slash = pattern.indexOf("/");
    const pHost = slash < 0 ? pattern : pattern.slice(0, slash);
    const pPath = slash < 0 ? "" : pattern.slice(slash);
    return (host === pHost || host.endsWith("." + pHost)) && (pathname + search).startsWith(pPath);
  } catch (_) {
    return false;
  }
}

function isExcluded(tab) {
  return [tab.url, tab.pendingUrl].some(url => url && exclusions.some(p => matchesPattern(url, p)));
}

function renderExclusions() {
  exclCount.textContent = exclusions.length;
  exclList.replaceChildren();

  if (!exclusions.length) {
    const empty = document.createElement("li");
    empty.className = "excl-empty";
    empty.textContent = "URL prefix (https://site.com/) or domain (site.com)";
    exclList.append(empty);
    return;
  }

  exclusions.forEach((pattern, i) => {
    const item = document.createElement("li");
    item.className = "excl-item";

    const text = document.createElement("span");
    text.className = "excl-url";
    text.textContent = pattern;
    text.title = pattern;

    const remove = document.createElement("button");
    remove.className = "excl-remove";
    remove.title = "Remove";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      exclusions.splice(i, 1);
      saveExclusions();
      renderExclusions();
    });

    item.append(text, remove);
    exclList.append(item);
  });
}

(function initExclusions() {
  const open = localStorage.getItem("exclOpen") === "true";
  exclPanel.classList.toggle("visible", open);
  exclHeader.classList.toggle("open", open);
  renderExclusions();
})();

exclHeader.addEventListener("click", () => {
  const open = exclPanel.classList.toggle("visible");
  exclHeader.classList.toggle("open", open);
  localStorage.setItem("exclOpen", open);
  if (open) exclInput.focus();
});

// Several entries can be pasted at once, separated by spaces, commas or new lines
exclForm.addEventListener("submit", e => {
  e.preventDefault();
  const added = [...new Set(exclInput.value.split(/[\s,]+/))]
    .filter(p => p && !exclusions.includes(p));

  exclInput.value = "";
  if (!added.length) return;

  exclusions.push(...added);
  saveExclusions();
  renderExclusions();
  exclList.scrollTop = exclList.scrollHeight;
});

function setStatus(text, state) {
  status.textContent = text;
  status.className = state;
}

function setProgress(value) {
  // value: null = indeterminate, 0..100 = percent, -1 = hide
  progressFill.classList.remove("indeterminate");
  if (value === null) {
    progressFill.classList.add("indeterminate");
  } else {
    progressFill.style.width = (value < 0 ? 0 : value) + "%";
  }
}

async function loadStats() {
  try {
    const [tabs, windows] = await Promise.all([
      chrome.tabs.query({}),
      chrome.windows.getAll()
    ]);
    tabCountEl.textContent  = tabs.length;
    winCountEl.textContent  = windows.length;
  } catch (_) {
    tabCountEl.textContent = "?";
    winCountEl.textContent = "?";
  }
}

loadStats();

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btnLabel.textContent = "Reloading…";
  btnIcon.classList.add("spinning");
  setStatus("Reloading all tabs…", "loading");
  setProgress(null);

  try {
    const allTabs = await chrome.tabs.query({});
    const tabs = allTabs.filter(tab => !isExcluded(tab));
    const skipped = allTabs.length - tabs.length;
    const total = tabs.length;
    const delay = getDelay();
    let done = 0;

    if (delay > 0) {
      // Sequential with delay
      setProgress(0);
      for (const tab of tabs) {
        await chrome.tabs.reload(tab.id, { bypassCache: true }).catch(() => {});
        done++;
        setProgress(Math.round((done / total) * 100));
        if (done < total) await sleep(delay);
      }
    } else {
      // Parallel
      await Promise.all(
        tabs.map((tab) =>
          chrome.tabs.reload(tab.id, { bypassCache: true })
            .catch(() => {})
            .finally(() => {
              done++;
              setProgress(Math.round((done / total) * 100));
            })
        )
      );
    }

    setProgress(100);
    lastCountEl.textContent = total;
    setStatus(
      `✓ Hard reloaded ${total} tab${total !== 1 ? "s" : ""}` + (skipped ? ` · ${skipped} skipped` : ""),
      "success"
    );
    btn.style.animation = "flash-success 0.8s ease forwards";
    setTimeout(() => { btn.style.animation = ""; }, 800);
  } catch (err) {
    setStatus("Error: " + err.message, "error");
    setProgress(-1);
  } finally {
    btn.disabled = false;
    btnLabel.textContent = "Reload All Tabs";
    btnIcon.classList.remove("spinning");
  }
});
