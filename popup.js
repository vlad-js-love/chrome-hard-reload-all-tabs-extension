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
    const tabs = await chrome.tabs.query({});
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

    lastCountEl.textContent = total;
    setStatus(`✓ Hard reloaded ${total} tab${total !== 1 ? "s" : ""}`, "success");
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
