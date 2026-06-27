const episodeListEl = document.getElementById("episode-list");
const episodePanelToggleEl = document.getElementById("episode-panel-toggle");
const pagePrevEl = document.getElementById("page-prev");
const pageNextEl = document.getElementById("page-next");
const pageLabelEl = document.getElementById("page-label");
const episodeSummaryEl = document.getElementById("episode-summary");
const episodeTitleEl = document.getElementById("episode-title");
const sourceLinkEl = document.getElementById("source-link");
const seriesLabelEl = document.getElementById("series-label");
const audioPlayerEl = document.getElementById("audio-player");
const videoPlayerEl = document.getElementById("video-player");
const playerStatusEl = document.getElementById("player-status");
const subtitleListEl = document.getElementById("subtitle-list");
const furiganaToggleEl = document.getElementById("furigana-toggle");
const autoNextToggleEl = document.getElementById("auto-next-toggle");
const subtitleTemplateEl = document.getElementById("subtitle-row-template");
const filterButtons = {
  all: document.getElementById("filter-all"),
  podcast: document.getElementById("filter-podcast"),
  anime: document.getElementById("filter-anime"),
};

const EPISODES_PER_PAGE = 10;

let episodeCatalog = [];
let filteredCatalog = [];
let currentEpisode = null;
let subtitleRowEls = [];
let activeRowIndex = -1;
let furiganaVisible = true;
let autoNextEnabled = false;
let currentPage = 0;
let episodePanelExpanded = false;
let activeCategory = "all";

function isMobileLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function getMediaPlayerEl() {
  if (!currentEpisode) {
    return audioPlayerEl;
  }
  return currentEpisode.media_type === "video" ? videoPlayerEl : audioPlayerEl;
}

function getVisibleCatalog() {
  return filteredCatalog;
}

function getTotalPages() {
  return Math.max(1, Math.ceil(getVisibleCatalog().length / EPISODES_PER_PAGE));
}

function getEpisodePageIndex(episodeId) {
  const visible = getVisibleCatalog();
  const foundIndex = visible.findIndex((episode) => episode.id === episodeId);
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

function resolveMediaUrl(url) {
  if (window.location.protocol === "https:" && url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }
  return url;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeEpisodeMeta(meta) {
  const mediaType = meta.media_type || (meta.video_url ? "video" : "audio");
  return {
    ...meta,
    media_type: mediaType,
    media_url: meta.media_url || meta.audio_url || meta.video_url || "",
    data_path: meta.data_path || "",
    category_id: meta.category_id || (mediaType === "video" ? "anime" : "podcast"),
    category_title: meta.category_title || (mediaType === "video" ? "Anime" : "Podcast"),
    series_title: meta.series_title || "Nihongo con Teppei",
    series_id: meta.series_id || "nihongo-con-teppei",
  };
}

function normalizeEpisodePayload(payload, meta) {
  const normalizedMeta = normalizeEpisodeMeta(meta || payload);
  return {
    ...payload,
    ...normalizedMeta,
    media_type: payload.media_type || normalizedMeta.media_type,
    media_url:
      payload.media_url ||
      payload.audio_url ||
      payload.video_url ||
      normalizedMeta.media_url,
    data_path: payload.data_path || normalizedMeta.data_path || "",
    category_id: payload.category_id || normalizedMeta.category_id,
    category_title: payload.category_title || normalizedMeta.category_title,
    series_id: payload.series_id || normalizedMeta.series_id,
    series_title: payload.series_title || normalizedMeta.series_title,
  };
}

function updateFilterButtons() {
  Object.entries(filterButtons).forEach(([key, button]) => {
    button.classList.toggle("active", key === activeCategory);
  });
}

function applyFilter(nextFilter) {
  activeCategory = nextFilter;
  filteredCatalog = episodeCatalog.filter((episode) => {
    if (activeCategory === "all") {
      return true;
    }
    return episode.category_id === activeCategory;
  });
  if (!filteredCatalog.length) {
    currentPage = 0;
    renderEpisodeList();
    return;
  }
  if (!currentEpisode || !filteredCatalog.some((episode) => episode.id === currentEpisode.id)) {
    loadEpisode(filteredCatalog[0]).catch((error) => {
      console.error(error);
      setStatus(error.message);
    });
    return;
  }
  currentPage = getEpisodePageIndex(currentEpisode.id);
  renderEpisodeList();
}

function renderEpisodeList() {
  episodeListEl.innerHTML = "";
  const visibleCatalog = getVisibleCatalog();
  const totalPages = getTotalPages();
  currentPage = Math.min(currentPage, totalPages - 1);
  const start = currentPage * EPISODES_PER_PAGE;
  const visibleEpisodes = visibleCatalog.slice(start, start + EPISODES_PER_PAGE);
  const end = start + visibleEpisodes.length;

  const groupedEpisodes = [];
  for (const episode of visibleEpisodes) {
    const lastGroup = groupedEpisodes[groupedEpisodes.length - 1];
    if (!lastGroup || lastGroup.series_id !== episode.series_id) {
      groupedEpisodes.push({
        series_id: episode.series_id,
        series_title: episode.series_title,
        category_title: episode.category_title,
        episodes: [episode],
      });
    } else {
      lastGroup.episodes.push(episode);
    }
  }

  for (const group of groupedEpisodes) {
    const groupEl = document.createElement("section");
    groupEl.className = "series-group";

    const headerEl = document.createElement("div");
    headerEl.className = "series-header";
    headerEl.innerHTML = `
      <div class="series-kicker">${escapeHtml(group.category_title)}</div>
      <div class="series-name">${escapeHtml(group.series_title)}</div>
    `;
    groupEl.appendChild(headerEl);

    for (const episode of group.episodes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "episode-button";
      if (currentEpisode && currentEpisode.id === episode.id) {
        button.classList.add("active");
      }
      button.innerHTML = `
        <div class="episode-meta">
          <span class="episode-id">${escapeHtml(episode.id)}</span>
          <span class="episode-badge">${escapeHtml(episode.media_type)}</span>
        </div>
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
      groupEl.appendChild(button);
    }

    episodeListEl.appendChild(groupEl);
  }

  if (visibleCatalog.length) {
    pageLabelEl.textContent = `${currentPage + 1} / ${totalPages}`;
    episodeSummaryEl.textContent = `Showing ${start + 1}-${end} of ${visibleCatalog.length}`;
  } else {
    pageLabelEl.textContent = "0 / 0";
    episodeSummaryEl.textContent = "No items in this view";
  }
  pagePrevEl.disabled = currentPage === 0 || !visibleCatalog.length;
  pageNextEl.disabled = currentPage >= totalPages - 1 || !visibleCatalog.length;
  updateFilterButtons();
}

function renderSubtitleRows(entries) {
  subtitleListEl.innerHTML = "";
  subtitleRowEls = [];
  activeRowIndex = -1;

  for (const entry of entries) {
    const fragment = subtitleTemplateEl.content.cloneNode(true);
    fragment.querySelector(".subtitle-row").dataset.start = String(entry.start);
    fragment.querySelector(".subtitle-row").dataset.end = String(entry.end);
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

function getCurrentEpisodeIndex() {
  if (!currentEpisode) {
    return -1;
  }
  return getVisibleCatalog().findIndex((episode) => episode.id === currentEpisode.id);
}

async function playCurrentEpisode() {
  try {
    await getMediaPlayerEl().play();
    return true;
  } catch (error) {
    console.error(error);
    setStatus("Loaded next item, but autoplay was blocked.");
    return false;
  }
}

async function maybePlayNextEpisode() {
  if (!autoNextEnabled) {
    setStatus("Finished.");
    return;
  }
  const currentIndex = getCurrentEpisodeIndex();
  const nextMeta = currentIndex >= 0 ? getVisibleCatalog()[currentIndex + 1] : null;
  if (!nextMeta) {
    setStatus("Finished. No next item.");
    return;
  }
  setStatus(`Loading next item: ${nextMeta.id}…`);
  await loadEpisode(nextMeta);
  const started = await playCurrentEpisode();
  if (started) {
    setStatus(`Playing next item: ${nextMeta.id}.`);
  }
}

function resetInactivePlayer(nextMediaType) {
  const inactivePlayer = nextMediaType === "video" ? audioPlayerEl : videoPlayerEl;
  inactivePlayer.pause();
  inactivePlayer.removeAttribute("src");
  inactivePlayer.load();
}

async function loadEpisode(meta) {
  setStatus("Loading subtitles…");
  const normalizedMeta = normalizeEpisodeMeta(meta);
  const episodePath = normalizedMeta.data_path || `${normalizedMeta.id}.json`;
  const response = await fetch(`./data/${episodePath}`);
  if (!response.ok) {
    throw new Error(`Failed to load episode data for ${normalizedMeta.id}`);
  }
  currentEpisode = normalizeEpisodePayload(await response.json(), normalizedMeta);
  currentPage = getEpisodePageIndex(currentEpisode.id);
  episodeTitleEl.textContent = currentEpisode.title;
  seriesLabelEl.textContent = `${currentEpisode.category_title} / ${currentEpisode.series_title}`;
  sourceLinkEl.href = currentEpisode.source_url || "https://nihongoconteppei.com/";
  document.body.classList.toggle("media-video", currentEpisode.media_type === "video");
  document.body.classList.toggle("media-audio", currentEpisode.media_type !== "video");
  resetInactivePlayer(currentEpisode.media_type);
  getMediaPlayerEl().src = resolveMediaUrl(currentEpisode.media_url);
  renderEpisodeList();
  renderSubtitleRows(currentEpisode.entries);
  syncSubtitleToTime(0);
  setStatus("Ready.");
}

async function boot() {
  let catalogPayload = null;
  const catalogResponse = await fetch("./data/catalog.json");
  if (catalogResponse.ok) {
    catalogPayload = await catalogResponse.json();
  } else {
    const legacyResponse = await fetch("./data/episodes.json");
    if (!legacyResponse.ok) {
      throw new Error("Failed to load episode catalog.");
    }
    catalogPayload = await legacyResponse.json();
  }
  const catalogEntries = Array.isArray(catalogPayload)
    ? catalogPayload
    : catalogPayload.episodes || [];
  episodeCatalog = catalogEntries.map(normalizeEpisodeMeta);
  filteredCatalog = [...episodeCatalog];
  if (!episodeCatalog.length) {
    throw new Error("No episodes found.");
  }
  await loadEpisode(filteredCatalog[0]);
}

function bindMediaPlayerEvents(playerEl, mediaLabel) {
  playerEl.addEventListener("timeupdate", () => {
    if (playerEl !== getMediaPlayerEl()) {
      return;
    }
    syncSubtitleToTime(playerEl.currentTime);
  });

  playerEl.addEventListener("play", () => {
    if (playerEl !== getMediaPlayerEl()) {
      return;
    }
    setStatus("Playing.");
  });

  playerEl.addEventListener("pause", () => {
    if (playerEl !== getMediaPlayerEl() || playerEl.ended) {
      return;
    }
    setStatus("Paused.");
  });

  playerEl.addEventListener("ended", () => {
    if (playerEl !== getMediaPlayerEl()) {
      return;
    }
    maybePlayNextEpisode().catch((error) => {
      console.error(error);
      setStatus(error.message);
    });
  });

  playerEl.addEventListener("error", () => {
    if (playerEl !== getMediaPlayerEl()) {
      return;
    }
    setStatus(`${mediaLabel} failed to load. The remote host may be blocking direct playback.`);
  });
}

bindMediaPlayerEvents(audioPlayerEl, "Audio");
bindMediaPlayerEvents(videoPlayerEl, "Video");

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

Object.entries(filterButtons).forEach(([key, button]) => {
  button.addEventListener("click", () => {
    if (activeCategory === key) {
      return;
    }
    currentPage = 0;
    applyFilter(key);
  });
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
