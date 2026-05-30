const episodeListEl = document.getElementById("episode-list");
const episodePanelToggleEl = document.getElementById("episode-panel-toggle");
const pagePrevEl = document.getElementById("page-prev");
const pageNextEl = document.getElementById("page-next");
const pageLabelEl = document.getElementById("page-label");
const episodeSummaryEl = document.getElementById("episode-summary");
const episodeTitleEl = document.getElementById("episode-title");
const sourceLinkEl = document.getElementById("source-link");
const audioPlayerEl = document.getElementById("audio-player");
const playerStatusEl = document.getElementById("player-status");
const seekBackwardEl = document.getElementById("seek-backward");
const seekForwardEl = document.getElementById("seek-forward");
const subtitleListEl = document.getElementById("subtitle-list");
const furiganaToggleEl = document.getElementById("furigana-toggle");
const autoNextToggleEl = document.getElementById("auto-next-toggle");
const subtitleTemplateEl = document.getElementById("subtitle-row-template");

const EPISODES_PER_PAGE = 10;

let episodeCatalog = [];
let currentEpisode = null;
let subtitleRowEls = [];
let activeRowIndex = -1;
let furiganaVisible = true;
let autoNextEnabled = false;
let currentPage = 0;
let episodePanelExpanded = false;

function isMobileLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function getTotalPages() {
  return Math.max(1, Math.ceil(episodeCatalog.length / EPISODES_PER_PAGE));
}

function getEpisodePageIndex(episodeId) {
  const foundIndex = episodeCatalog.findIndex((episode) => episode.id === episodeId);
  if (foundIndex < 0) {
    return 0;
  }
  return Math.floor(foundIndex / EPISODES_PER_PAGE);
}

function updateEpisodePanelState() {
  const expanded = !isMobileLayout() || episodePanelExpanded;
  document.body.classList.toggle("episode-panel-open", expanded);
  episodePanelToggleEl.setAttribute("aria-expanded", String(expanded));
  episodePanelToggleEl.textContent = expanded ? "Hide episodes" : "Episodes";
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
  const totalPages = getTotalPages();
  currentPage = Math.min(currentPage, totalPages - 1);
  const start = currentPage * EPISODES_PER_PAGE;
  const visibleEpisodes = episodeCatalog.slice(start, start + EPISODES_PER_PAGE);
  const end = start + visibleEpisodes.length;

  for (const episode of visibleEpisodes) {
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
      if (isMobileLayout()) {
        episodePanelExpanded = false;
        updateEpisodePanelState();
      }
    });
    episodeListEl.appendChild(button);
  }

  pageLabelEl.textContent = `${currentPage + 1} / ${totalPages}`;
  episodeSummaryEl.textContent = `Showing ${start + 1}-${end} of ${episodeCatalog.length}`;
  pagePrevEl.disabled = currentPage === 0;
  pageNextEl.disabled = currentPage >= totalPages - 1;
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

function seekBy(seconds) {
  if (!audioPlayerEl.src) {
    return;
  }
  const duration = Number.isFinite(audioPlayerEl.duration) ? audioPlayerEl.duration : null;
  const targetTime = audioPlayerEl.currentTime + seconds;
  if (duration === null) {
    audioPlayerEl.currentTime = Math.max(0, targetTime);
    return;
  }
  audioPlayerEl.currentTime = Math.min(duration, Math.max(0, targetTime));
}

function getCurrentEpisodeIndex() {
  if (!currentEpisode) {
    return -1;
  }
  return episodeCatalog.findIndex((episode) => episode.id === currentEpisode.id);
}

async function playCurrentEpisode() {
  try {
    await audioPlayerEl.play();
    return true;
  } catch (error) {
    console.error(error);
    setStatus("Loaded next episode, but autoplay was blocked.");
    return false;
  }
}

async function maybePlayNextEpisode() {
  if (!autoNextEnabled) {
    setStatus("Finished.");
    return;
  }
  const currentIndex = getCurrentEpisodeIndex();
  const nextMeta = currentIndex >= 0 ? episodeCatalog[currentIndex + 1] : null;
  if (!nextMeta) {
    setStatus("Finished. No next episode.");
    return;
  }
  setStatus(`Loading next episode: ${nextMeta.id}…`);
  await loadEpisode(nextMeta);
  const started = await playCurrentEpisode();
  if (started) {
    setStatus(`Playing next episode: ${nextMeta.id}.`);
  }
}

async function loadEpisode(meta) {
  setStatus("Loading subtitles…");
  const response = await fetch(`./data/${meta.id}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load episode data for ${meta.id}`);
  }
  currentEpisode = await response.json();
  currentPage = getEpisodePageIndex(currentEpisode.id);
  episodeTitleEl.textContent = currentEpisode.title;
  sourceLinkEl.href = currentEpisode.source_url || "https://nihongoconteppei.com/";
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
  maybePlayNextEpisode().catch((error) => {
    console.error(error);
    setStatus(error.message);
  });
});

audioPlayerEl.addEventListener("error", () => {
  setStatus("Audio failed to load. The remote host may be blocking direct playback.");
});

episodePanelToggleEl.addEventListener("click", () => {
  episodePanelExpanded = !episodePanelExpanded;
  updateEpisodePanelState();
});

pagePrevEl.addEventListener("click", () => {
  if (currentPage === 0) {
    return;
  }
  currentPage -= 1;
  renderEpisodeList();
});

pageNextEl.addEventListener("click", () => {
  if (currentPage >= getTotalPages() - 1) {
    return;
  }
  currentPage += 1;
  renderEpisodeList();
});

furiganaToggleEl.addEventListener("click", () => {
  furiganaVisible = !furiganaVisible;
  document.body.classList.toggle("hide-furigana", !furiganaVisible);
  furiganaToggleEl.textContent = furiganaVisible ? "Furigana: ON" : "Furigana: OFF";
});

autoNextToggleEl.addEventListener("click", () => {
  autoNextEnabled = !autoNextEnabled;
  autoNextToggleEl.textContent = autoNextEnabled ? "Auto next: ON" : "Auto next: OFF";
});

seekBackwardEl.addEventListener("click", () => {
  seekBy(-15);
});

seekForwardEl.addEventListener("click", () => {
  seekBy(15);
});

window.addEventListener("resize", () => {
  if (!isMobileLayout()) {
    episodePanelExpanded = false;
  }
  updateEpisodePanelState();
});

boot().catch((error) => {
  console.error(error);
  setStatus(error.message);
  episodeTitleEl.textContent = "Failed to load player";
});

updateEpisodePanelState();
