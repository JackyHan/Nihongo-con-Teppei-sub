const episodeListEl = document.getElementById("episode-list");
const episodeTitleEl = document.getElementById("episode-title");
const sourceLinkEl = document.getElementById("source-link");
const audioPlayerEl = document.getElementById("audio-player");
const playerStatusEl = document.getElementById("player-status");
const subtitleListEl = document.getElementById("subtitle-list");
const furiganaToggleEl = document.getElementById("furigana-toggle");
const subtitleTemplateEl = document.getElementById("subtitle-row-template");

let episodeCatalog = [];
let currentEpisode = null;
let subtitleRowEls = [];
let activeRowIndex = -1;
let furiganaVisible = true;

function isMobileLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function resolveAudioUrl(url) {
  if (window.location.protocol === "https:" && url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }
  return url;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEpisodeList() {
  episodeListEl.innerHTML = "";
  for (const episode of episodeCatalog) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "episode-button";
    if (currentEpisode && currentEpisode.id === episode.id) {
      button.classList.add("active");
    }
    button.innerHTML = `
      <span class="episode-id">${escapeHtml(episode.id)}</span>
      <span class="episode-name">${escapeHtml(episode.title)}</span>
    `;
    button.addEventListener("click", () => {
      if (!currentEpisode || currentEpisode.id !== episode.id) {
        loadEpisode(episode);
      }
    });
    episodeListEl.appendChild(button);
  }
}

function renderSubtitleRows(entries) {
  subtitleListEl.innerHTML = "";
  subtitleRowEls = [];
  activeRowIndex = -1;

  for (const entry of entries) {
    const fragment = subtitleTemplateEl.content.cloneNode(true);
    const rowEl = fragment.querySelector(".subtitle-row");
    rowEl.dataset.start = String(entry.start);
    rowEl.dataset.end = String(entry.end);
    fragment.querySelector(".subtitle-ts").textContent = entry.ts;
    fragment.querySelector(".subtitle-jp").innerHTML = entry.jp_html;
    fragment.querySelector(".subtitle-en").innerHTML = escapeHtml(entry.en).replaceAll("\n", "<br>");
    fragment.querySelector(".subtitle-zh").innerHTML = escapeHtml(entry.zh).replaceAll("\n", "<br>");
    subtitleListEl.appendChild(fragment);
    subtitleRowEls.push(subtitleListEl.lastElementChild);
  }
}

function setActiveRow(nextIndex) {
  if (activeRowIndex === nextIndex) {
    return;
  }
  if (activeRowIndex >= 0 && subtitleRowEls[activeRowIndex]) {
    subtitleRowEls[activeRowIndex].classList.remove("active");
  }
  activeRowIndex = nextIndex;
  if (activeRowIndex >= 0 && subtitleRowEls[activeRowIndex]) {
    const rowEl = subtitleRowEls[activeRowIndex];
    rowEl.classList.add("active");
    const safeMargin = isMobileLayout() ? 16 : 32;
    const rowRect = rowEl.getBoundingClientRect();
    const listRect = subtitleListEl.getBoundingClientRect();
    const isAbove = rowRect.top < listRect.top + safeMargin;
    const isBelow = rowRect.bottom > listRect.bottom - safeMargin;

    if (isAbove || isBelow) {
      rowEl.scrollIntoView({
        block: isMobileLayout() ? "nearest" : "center",
        inline: "nearest",
        behavior: isMobileLayout() ? "auto" : "smooth",
      });
    }
  }
}

function syncSubtitleToTime(currentTime) {
  if (!currentEpisode) {
    return;
  }
  const entries = currentEpisode.entries;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.start <= currentTime && currentTime < entry.end) {
      setActiveRow(index);
      return;
    }
  }
  if (entries.length && currentTime >= entries[entries.length - 1].end) {
    setActiveRow(entries.length - 1);
    return;
  }
  setActiveRow(-1);
}

function setStatus(text) {
  playerStatusEl.textContent = text;
}

async function loadEpisode(meta) {
  setStatus("Loading subtitles…");
  const response = await fetch(`./data/${meta.id}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load episode data for ${meta.id}`);
  }
  currentEpisode = await response.json();
  episodeTitleEl.textContent = currentEpisode.title;
  audioPlayerEl.src = resolveAudioUrl(currentEpisode.audio_url);
  renderEpisodeList();
  renderSubtitleRows(currentEpisode.entries);
  setStatus("Ready.");
}

async function boot() {
  const response = await fetch("./data/episodes.json");
  if (!response.ok) {
    throw new Error("Failed to load episode catalog.");
  }
  episodeCatalog = await response.json();
  if (!episodeCatalog.length) {
    throw new Error("No episodes found.");
  }
  await loadEpisode(episodeCatalog[0]);
}

audioPlayerEl.addEventListener("timeupdate", () => {
  syncSubtitleToTime(audioPlayerEl.currentTime);
});

audioPlayerEl.addEventListener("play", () => {
  setStatus("Playing.");
});

audioPlayerEl.addEventListener("pause", () => {
  if (!audioPlayerEl.ended) {
    setStatus("Paused.");
  }
});

audioPlayerEl.addEventListener("ended", () => {
  setStatus("Finished.");
});

audioPlayerEl.addEventListener("error", () => {
  setStatus("Audio failed to load. The remote host may be blocking direct playback.");
});

furiganaToggleEl.addEventListener("click", () => {
  furiganaVisible = !furiganaVisible;
  document.body.classList.toggle("hide-furigana", !furiganaVisible);
  furiganaToggleEl.textContent = furiganaVisible ? "Furigana: ON" : "Furigana: OFF";
});

boot().catch((error) => {
  console.error(error);
  setStatus(error.message);
  episodeTitleEl.textContent = "Failed to load player";
});
