const toggle = document.querySelector(".nav-toggle"); const nav = document.querySelector("#site-nav"); if (toggle && nav) { toggle.addEventListener("click", () => { const isOpen = nav.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", String(isOpen)); }); } const backToTop = document.querySelector(".back-to-top"); if (backToTop) { const setBackToTopState = () => { const isVisible = window.scrollY > 420; backToTop.classList.toggle("is-visible", isVisible); backToTop.setAttribute("aria-hidden", String(!isVisible)); backToTop.tabIndex = isVisible ? 0 : -1; }; backToTop.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); }); setBackToTopState(); window.addEventListener("scroll", setBackToTopState, { passive: true }); } const matchSlider = document.querySelector("#home-match-slider"); const matchSliderButtons = document.querySelectorAll("[data-match-slider]"); if (matchSlider && matchSliderButtons.length) { matchSliderButtons.forEach((button) => { button.addEventListener("click", () => { const direction = button.dataset.matchSlider === "previous" ? -1 : 1; const card = matchSlider.querySelector(".match-rail-card"); const gap = 14; const distance = card ? card.getBoundingClientRect().width + gap : matchSlider.clientWidth; matchSlider.scrollLeft += direction * distance; }); }); } const scheduleVenueFilter = document.querySelector("#schedule-venue-filter"); const scheduleTeamFilter = document.querySelector("#schedule-team-filter"); const scheduleMatchCards = document.querySelectorAll("[data-schedule-match]"); const scheduleFilterCount = document.querySelector("#schedule-filter-count"); const scheduleEmptyState = document.querySelector("#schedule-empty-state"); const scheduleStageHeading = document.querySelector("[data-schedule-stage-heading]"); if (scheduleMatchCards.length && scheduleVenueFilter && scheduleTeamFilter) { const updateScheduleFilters = () => { const venue = scheduleVenueFilter.value; const team = scheduleTeamFilter.value; let visibleMatches = 0; scheduleMatchCards.forEach((card) => { const teamSlugs = card.dataset.teamSlugs.trim().split(/\s+/).filter(Boolean); const venueMatches = !venue || card.dataset.venueSlug === venue; const teamMatches = !team || teamSlugs.includes(team); const isVisible = venueMatches && teamMatches; card.hidden = !isVisible; if (isVisible) { visibleMatches += 1; } }); if (scheduleFilterCount) { scheduleFilterCount.textContent = `${visibleMatches} ${visibleMatches === 1 ? "match" : "matches"}`; } if (scheduleEmptyState) { scheduleEmptyState.hidden = visibleMatches !== 0; } if (scheduleStageHeading) { const hasVisiblePlayoff = [...scheduleMatchCards].some( (card) => !card.hidden && card.dataset.stage !== "League", ); scheduleStageHeading.hidden = !hasVisiblePlayoff; } }; scheduleVenueFilter.addEventListener("change", updateScheduleFilters); scheduleTeamFilter.addEventListener("change", updateScheduleFilters); }

const adsterraExcludedPaths = new Set([
  "/404.html",
  "/authors/",
  "/contact-us/",
  "/privacy-policy/",
  "/terms-of-service/",
]);
const adsterraIsExcluded =
  adsterraExcludedPaths.has(window.location.pathname) ||
  window.location.pathname.startsWith("/authors/");

if (!adsterraIsExcluded) {
  const adMain = document.querySelector("main#main");
  const adAnchor = adMain?.querySelector(":scope > section") || adMain?.querySelector("section");

  if (adMain && adAnchor && !document.querySelector("[data-adsterra-banner]")) {
    const adBanner = document.createElement("aside");
    adBanner.className = "site-ad-banner";
    adBanner.dataset.adsterraBanner = "";
    adBanner.setAttribute("aria-label", "Advertisement");

    const adLabel = document.createElement("span");
    adLabel.className = "site-ad-label";
    adLabel.textContent = "Advertisement";

    const adFrame = document.createElement("div");
    adFrame.className = "site-ad-frame";
    adFrame.dataset.adsterraFrame = "";
    adBanner.append(adLabel, adFrame);
    adAnchor.after(adBanner);

    const mobileAdQuery = window.matchMedia("(max-width: 799px)");
    const adUnits = {
      desktop: {
        key: "a8dc0e9fbc89cd9ca00f2f2adf50432f",
        width: 728,
        height: 90,
      },
      mobile: {
        key: "56d2800b0941446f2757b73bf69f9e75",
        width: 300,
        height: 250,
      },
    };
    let activeAdSize = "";

    const renderAdsterraBanner = () => {
      const size = mobileAdQuery.matches ? "mobile" : "desktop";
      if (size === activeAdSize) return;
      activeAdSize = size;
      const unit = adUnits[size];
      const adIframe = document.createElement("iframe");
      const adScriptUrl = `https://unsettledradiator.com/${unit.key}/invoke.js`;
      adIframe.title = `${unit.width} by ${unit.height} advertisement`;
      adIframe.width = String(unit.width);
      adIframe.height = String(unit.height);
      adIframe.loading = "lazy";
      adIframe.scrolling = "no";
      adIframe.referrerPolicy = "strict-origin-when-cross-origin";
      adIframe.setAttribute("frameborder", "0");
      adIframe.srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;overflow:hidden"><script>atOptions={'key':'${unit.key}','format':'iframe','height':${unit.height},'width':${unit.width},'params':{}};<\/script><script src="${adScriptUrl}"><\/script></body></html>`;
      adFrame.replaceChildren(adIframe);
      adBanner.dataset.adSize = `${unit.width}x${unit.height}`;
    };

    renderAdsterraBanner();
    mobileAdQuery.addEventListener?.("change", renderAdsterraBanner);
  }
}

const squadSearch = document.querySelector("#squad-player-search");
const squadFilterButtons = document.querySelectorAll("[data-squad-filter]");
const squadPlayers = document.querySelectorAll("[data-squad-player]");
const squadTeams = document.querySelectorAll("[data-squad-team]");
const squadResultCount = document.querySelector("#squad-result-count");
const squadEmptyState = document.querySelector("#squad-empty-state");

if (squadSearch && squadPlayers.length) {
  let activeSquadCategory = "all";

  const updateSquadFilters = () => {
    const query = squadSearch.value.trim().toLowerCase();
    let visiblePlayers = 0;

    squadPlayers.forEach((player) => {
      const matchesName = !query || player.dataset.playerName.includes(query);
      const matchesCategory =
        activeSquadCategory === "all" ||
        player.dataset.playerCategory === activeSquadCategory;
      const isVisible = matchesName && matchesCategory;
      player.hidden = !isVisible;
      if (isVisible) visiblePlayers += 1;
    });

    squadTeams.forEach((team) => {
      let teamHasPlayers = false;
      team.querySelectorAll("[data-roster-group]").forEach((group) => {
        const groupHasPlayers = [...group.querySelectorAll("[data-squad-player]")]
          .some((player) => !player.hidden);
        group.hidden = !groupHasPlayers;
        if (groupHasPlayers) teamHasPlayers = true;
      });
      team.hidden = !teamHasPlayers;
    });

    if (squadResultCount) {
      squadResultCount.textContent =
        `${visiblePlayers} ${visiblePlayers === 1 ? "player" : "players"} shown`;
    }
    if (squadEmptyState) squadEmptyState.hidden = visiblePlayers !== 0;
  };

  squadSearch.addEventListener("input", updateSquadFilters);
  squadFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeSquadCategory = button.dataset.squadFilter;
      squadFilterButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("is-active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      updateSquadFilters();
    });
  });
}

const matchSpotlights = [...document.querySelectorAll("[data-match-spotlight]")];
if (matchSpotlights.length) {
  const settledSpotlightStatuses = new Set([
    "complete", "completed", "closed", "finished", "final", "abandoned",
    "cancelled", "canceled", "no result",
  ]);
  const normalizeSpotlightStatus = (value = "") =>
    String(value).trim().toLowerCase().replace(/[_-]+/g, " ");
  let spotlightRequestInProgress = false;
  let spotlightSignature = "";

  const renderMatchSpotlight = (match, seasonComplete = false) => {
    const signature = `${match.matchNumber}:${seasonComplete}`;
    if (signature === spotlightSignature) return;
    spotlightSignature = signature;
    matchSpotlights.forEach((spotlight) => {
      const setText = (selector, value) => {
        const element = spotlight.querySelector(selector);
        if (element) element.textContent = value;
      };
      setText(
        "[data-match-spotlight-kicker]",
        seasonComplete ? "Season final" : match.matchNumber === 1 ? "Opening match" : `Next match · Match ${match.matchNumber}`,
      );
      setText("[data-match-spotlight-date]", match.label);
      setText("[data-match-spotlight-home]", match.home);
      setText("[data-match-spotlight-away]", match.away);
      setText("[data-match-spotlight-time]", match.time);
      setText("[data-match-spotlight-venue]", match.venueShort || match.venue);
      const link = spotlight.matches("[data-match-spotlight-link]")
        ? spotlight
        : spotlight.querySelector("[data-match-spotlight-link]");
      if (link) link.href = match.url;
    });
  };

  const refreshMatchSpotlights = async () => {
    if (spotlightRequestInProgress) return;
    spotlightRequestInProgress = true;
    try {
      const [scheduleResponse, statusResponse] = await Promise.all([
        fetch("/static/match-spotlight.json", { cache: "force-cache" }),
        fetch("/api/cpl-matches", { cache: "default", priority: "high" }),
      ]);
      if (!scheduleResponse.ok || !statusResponse.ok) throw new Error("Match spotlight feed unavailable");
      const [schedule, statuses] = await Promise.all([
        scheduleResponse.json(),
        statusResponse.json(),
      ]);
      if (!Array.isArray(schedule) || !schedule.length || !Array.isArray(statuses)) {
        throw new Error("Invalid match spotlight response");
      }
      const statusByNumber = new Map(
        statuses.map((match) => [Number(match.matchNumber), normalizeSpotlightStatus(match.status)]),
      );
      const completionBuffer = 6 * 60 * 60 * 1000;
      const isSettled = (match) => {
        const status = statusByNumber.get(Number(match.matchNumber));
        if (settledSpotlightStatuses.has(status)) return true;
        if (status) return false;
        const start = Date.parse(match.startIso);
        return Number.isFinite(start) && Date.now() >= start + completionBuffer;
      };
      const nextMatch = schedule.find((match) => !isSettled(match));
      renderMatchSpotlight(nextMatch || schedule[schedule.length - 1], !nextMatch);
    } catch (error) {
      console.warn("CPL match spotlight refresh unavailable", error);
    } finally {
      spotlightRequestInProgress = false;
    }
  };

  refreshMatchSpotlights();
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshMatchSpotlights();
  }, 30000);
}

const playerDirectorySearch = document.querySelector("#player-directory-search");
const playerDirectoryCards = document.querySelectorAll("[data-directory-player]");
const playerCategorySelect = document.querySelector("#player-category-select");
const playerTeamSelect = document.querySelector("#player-team-select");
const playerTeamButtons = document.querySelectorAll(".pd-team-shortcuts button[data-player-team]");
const playerRoleButtons = document.querySelectorAll(".pd-role-filters button[data-player-role]");
const playerDirectoryCount = document.querySelector("#player-directory-count");
const playerDirectoryEmpty = document.querySelector("#player-directory-empty");
const playerDirectoryReset = document.querySelector("#player-directory-reset");
const playerPagePrev = document.querySelector("#player-page-prev");
const playerPageNext = document.querySelector("#player-page-next");
const playerPageStatus = document.querySelector("#player-page-status");
const playerPageNumbers = document.querySelector("#player-page-numbers");

if (playerDirectorySearch && playerDirectoryCards.length) {
  const pageSize = 8;
  let activePlayerPage = 1;
  let activePlayerRole = "all";

  const renderPlayerPageNumbers = (pageCount) => {
    if (!playerPageNumbers) return;
    playerPageNumbers.replaceChildren();
    const pages = [...new Set([
      1,
      activePlayerPage - 1,
      activePlayerPage,
      activePlayerPage + 1,
      pageCount,
    ].filter((page) => page >= 1 && page <= pageCount))].sort((a, b) => a - b);

    pages.forEach((page, index) => {
      if (index && page - pages[index - 1] > 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pd-page-ellipsis";
        ellipsis.textContent = "…";
        ellipsis.setAttribute("aria-hidden", "true");
        playerPageNumbers.append(ellipsis);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(page);
      button.classList.toggle("is-active", page === activePlayerPage);
      button.setAttribute("aria-label", `Show player page ${page}`);
      if (page === activePlayerPage) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => {
        activePlayerPage = page;
        updatePlayerDirectory();
        document.querySelector("#player-directory")?.scrollIntoView({ behavior: "smooth" });
      });
      playerPageNumbers.append(button);
    });
  };

  const updatePlayerDirectory = () => {
    const query = playerDirectorySearch.value.trim().toLowerCase();
    const activePlayerCategory = playerCategorySelect?.value || "all";
    const activePlayerTeam = playerTeamSelect?.value || "all";
    const matchingCards = [...playerDirectoryCards].filter((card) => {
      const matchesQuery =
        !query ||
        card.dataset.playerName.includes(query) ||
        card.dataset.teamName.includes(query);
      const matchesCategory =
        activePlayerCategory === "all" ||
        card.dataset.playerCategory === activePlayerCategory;
      const matchesTeam =
        activePlayerTeam === "all" ||
        card.dataset.playerTeam === activePlayerTeam;
      const matchesRole =
        activePlayerRole === "all" ||
        card.dataset.playerRole === activePlayerRole;
      return matchesQuery && matchesCategory && matchesTeam && matchesRole;
    });

    const pageCount = Math.max(1, Math.ceil(matchingCards.length / pageSize));
    activePlayerPage = Math.min(activePlayerPage, pageCount);
    const pageStart = (activePlayerPage - 1) * pageSize;
    const visiblePageCards = new Set(matchingCards.slice(pageStart, pageStart + pageSize));
    playerDirectoryCards.forEach((card) => {
      card.hidden = !visiblePageCards.has(card);
    });

    if (playerDirectoryCount) {
      playerDirectoryCount.textContent =
        `${matchingCards.length} ${matchingCards.length === 1 ? "player" : "players"} found`;
    }
    if (playerDirectoryEmpty) playerDirectoryEmpty.hidden = matchingCards.length !== 0;
    if (playerPageStatus) playerPageStatus.textContent = `Page ${activePlayerPage} of ${pageCount}`;
    if (playerPagePrev) playerPagePrev.disabled = activePlayerPage <= 1;
    if (playerPageNext) playerPageNext.disabled = activePlayerPage >= pageCount;
    renderPlayerPageNumbers(pageCount);
  };

  const resetPlayerPageAndUpdate = () => {
    activePlayerPage = 1;
    updatePlayerDirectory();
  };

  playerDirectorySearch.addEventListener("input", resetPlayerPageAndUpdate);
  playerCategorySelect?.addEventListener("change", resetPlayerPageAndUpdate);
  playerTeamSelect?.addEventListener("change", () => {
    playerTeamButtons.forEach((button) => {
      const isActive = button.dataset.playerTeam === playerTeamSelect.value;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    resetPlayerPageAndUpdate();
  });
  playerTeamButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (playerTeamSelect) playerTeamSelect.value = button.dataset.playerTeam;
      playerTeamButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("is-active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      resetPlayerPageAndUpdate();
    });
  });
  playerRoleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activePlayerRole = button.dataset.playerRole || "all";
      playerRoleButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("is-active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      resetPlayerPageAndUpdate();
    });
  });
  playerDirectoryReset?.addEventListener("click", () => {
    playerDirectorySearch.value = "";
    if (playerCategorySelect) playerCategorySelect.value = "all";
    if (playerTeamSelect) playerTeamSelect.value = "all";
    activePlayerRole = "all";
    playerTeamButtons.forEach((button) => {
      const isActive = button.dataset.playerTeam === "all";
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    playerRoleButtons.forEach((button) => {
      const isActive = button.dataset.playerRole === "all";
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    resetPlayerPageAndUpdate();
  });
  playerPagePrev?.addEventListener("click", () => {
    if (activePlayerPage > 1) activePlayerPage -= 1;
    updatePlayerDirectory();
    document.querySelector("#player-directory")?.scrollIntoView({ behavior: "smooth" });
  });
  playerPageNext?.addEventListener("click", () => {
    activePlayerPage += 1;
    updatePlayerDirectory();
    document.querySelector("#player-directory")?.scrollIntoView({ behavior: "smooth" });
  });
  updatePlayerDirectory();
}

const mainHeader = document.querySelector(".site-header");
const mainNav = document.querySelector("#site-nav");
const mainNavToggle = document.querySelector(".nav-toggle");

if (mainHeader && mainNav && mainNavToggle) {
  const closeMainNav = () => {
    mainNav.classList.remove("is-open");
    mainNavToggle.setAttribute("aria-expanded", "false");
  };

  const currentPath = window.location.pathname;
  const sectionPath = currentPath.startsWith("/player/")
    ? "/players/"
    : currentPath.startsWith("/team/")
      ? "/teams/"
      : currentPath.startsWith("/venue/")
        ? "/venues/"
        : currentPath.startsWith("/news/")
          ? "/news/"
          : currentPath;

  mainNav.querySelectorAll("a").forEach((link) => {
    const linkPath = new URL(link.href, window.location.origin).pathname;
    const isCurrent =
      sectionPath === linkPath ||
      (sectionPath === "/" && linkPath === "/");
    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
    link.addEventListener("click", closeMainNav);
  });

  document.addEventListener("click", (event) => {
    if (!mainHeader.contains(event.target)) closeMainNav();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMainNav();
      mainNavToggle.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) closeMainNav();
  });
}

const homeCountdown = document.querySelector("[data-countdown-target]");

if (homeCountdown) {
  const targetTime = Date.parse(homeCountdown.dataset.countdownTarget);
  const countdownStatus = homeCountdown.querySelector("[data-countdown-status]");
  const countdownFields = {
    days: homeCountdown.querySelector("[data-countdown-days]"),
    hours: homeCountdown.querySelector("[data-countdown-hours]"),
    minutes: homeCountdown.querySelector("[data-countdown-minutes]"),
    seconds: homeCountdown.querySelector("[data-countdown-seconds]"),
  };

  const renderCountdown = () => {
    const remaining = Math.max(0, targetTime - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const values = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };

    Object.entries(values).forEach(([unit, value]) => {
      if (countdownFields[unit]) {
        countdownFields[unit].textContent = String(value).padStart(2, "0");
      }
    });

    if (remaining === 0) {
      homeCountdown.classList.add("is-complete");
      if (countdownStatus) countdownStatus.textContent = "CPL 2026 is underway";
      return false;
    }
    return true;
  };

  if (Number.isFinite(targetTime) && renderCountdown()) {
    const countdownInterval = window.setInterval(() => {
      if (!renderCountdown()) window.clearInterval(countdownInterval);
    }, 1000);
  }
}

const homeMatchWindow = document.querySelector("[data-home-match-window]");

if (homeMatchWindow) {
  const endpoint = homeMatchWindow.dataset.matchStatusEndpoint;
  const grid = homeMatchWindow.querySelector("[data-match-window-grid]");
  const badge = homeMatchWindow.querySelector("[data-match-window-badge]");
  const title = homeMatchWindow.querySelector("[data-match-window-title]");
  const copy = homeMatchWindow.querySelector("[data-match-window-copy]");
  const sourceCards = [
    ...document.querySelectorAll("#home-match-slider .match-rail-card"),
  ];
  const settledStatuses = new Set([
    "complete",
    "completed",
    "closed",
    "finished",
    "final",
    "abandoned",
    "cancelled",
    "canceled",
    "no result",
  ]);
  let renderedSignature = "";
  let requestInProgress = false;

  const normalizeStatus = (status = "") =>
    String(status).trim().toLowerCase().replace(/[_-]+/g, " ");

  const scheduledStatusFrom = (card) => {
    const sourceTime = card.querySelector(".match-rail-time time");
    const localTime =
      card.querySelector(".match-rail-time > span")?.textContent.trim() || "";
    const date = sourceTime?.dateTime;
    const timeMatch = localTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!date || !timeMatch) return "Upcoming";

    let hour = Number(timeMatch[1]) % 12;
    if (timeMatch[3].toLowerCase() === "pm") hour += 12;
    const minute = Number(timeMatch[2] || 0);
    const startTime = Date.parse(
      `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-04:00`,
    );
    if (!Number.isFinite(startTime)) return "Upcoming";

    const completionBuffer = 6 * 60 * 60 * 1000;
    return Date.now() >= startTime + completionBuffer ? "Complete" : "Upcoming";
  };

  const matchNumberFrom = (card) => {
    const label = card.querySelector(".match-rail-card-header span");
    const match = label?.textContent.match(/\d+/);
    return match ? Number(match[0]) : 0;
  };

  const matchUrlFrom = (sourceCard, matchNumber) => {
    const existingLink = sourceCard.querySelector(".home-match-card-link");
    if (existingLink) return existingLink.getAttribute("href");
    const playoffUrls = {
      36: "/match/cpl-2026-eliminator/",
      37: "/match/cpl-2026-qualifier-1/",
      38: "/match/cpl-2026-qualifier-2/",
      39: "/match/cpl-2026-final/",
    };
    if (playoffUrls[matchNumber]) return playoffUrls[matchNumber];
    const teamLinks = [
      ...sourceCard.querySelectorAll('.match-rail-teams a[href^="/team/"]'),
    ].slice(0, 2);
    if (teamLinks.length !== 2) return "/schedule/";
    const slugs = teamLinks.map((link) =>
      link.pathname.split("/").filter(Boolean).pop(),
    );
    return `/match/${slugs[0]}-vs-${slugs[1]}/`;
  };

  const displayStatus = (status) => {
    const normalized = normalizeStatus(status);
    if (settledStatuses.has(normalized)) {
      return { label: "Complete", value: "complete" };
    }
    if (
      normalized === "live" ||
      normalized === "in progress" ||
      normalized === "inprogress"
    ) {
      return { label: "Live", value: "live" };
    }
    return { label: "Upcoming", value: "upcoming" };
  };

  const buildTeamLink = (sourceLink, name) => {
    const link = document.createElement("a");
    link.href = sourceLink?.getAttribute("href") || "/schedule/";
    const sourceImage = sourceLink?.querySelector("img");
    if (sourceImage) {
      const image = sourceImage.cloneNode();
      image.loading = "lazy";
      image.decoding = "async";
      link.append(image);
    }
    const label = document.createElement("span");
    label.textContent = name;
    link.append(label);
    return link;
  };

  const buildWindowCard = (sourceCard, status) => {
    const matchNumber = matchNumberFrom(sourceCard);
    const card = document.createElement("article");
    card.className = "match-centre-card";

    const cardLink = document.createElement("a");
    cardLink.className = "home-match-card-link";
    cardLink.href = matchUrlFrom(sourceCard, matchNumber);
    cardLink.setAttribute("aria-label", `Open Match ${matchNumber} centre`);
    card.append(cardLink);

    const top = document.createElement("div");
    top.className = "match-card-top";
    const numberLabel = document.createElement("span");
    numberLabel.textContent = `Match ${matchNumber}`;
    const statusLabel = document.createElement("strong");
    const visibleStatus = displayStatus(status);
    statusLabel.textContent = visibleStatus.label;
    statusLabel.dataset.status = visibleStatus.value;
    top.append(numberLabel, statusLabel);
    card.append(top);

    const sourceTeamLinks = [
      ...sourceCard.querySelectorAll(".match-rail-teams > a"),
    ].slice(0, 2);
    const titleText =
      sourceCard.querySelector(".match-rail-title")?.textContent.trim() || "";
    const teamNames = titleText.includes(" vs ")
      ? titleText.split(" vs ", 2)
      : sourceTeamLinks.map(
          (link) => link.getAttribute("aria-label")?.replace(/ team page$/, "") || "TBC",
        );
    const teams = document.createElement("div");
    teams.className = "match-card-teams";
    const versus = document.createElement("b");
    versus.textContent = "VS";
    teams.append(
      buildTeamLink(sourceTeamLinks[0], teamNames[0] || "TBC"),
      versus,
      buildTeamLink(sourceTeamLinks[1], teamNames[1] || "TBC"),
    );
    card.append(teams);

    const meta = document.createElement("div");
    meta.className = "match-card-meta";
    const sourceTime = sourceCard.querySelector(".match-rail-time time");
    const localTime =
      sourceCard.querySelector(".match-rail-time > span")?.textContent.trim() ||
      "";
    const time = document.createElement("time");
    if (sourceTime?.dateTime) time.dateTime = sourceTime.dateTime;
    time.textContent = [sourceTime?.textContent.trim(), localTime]
      .filter(Boolean)
      .join(" · ");
    const sourceVenue = sourceCard.querySelector(".match-rail-venue");
    const venue = document.createElement("a");
    venue.href = sourceVenue?.getAttribute("href") || "/venues/";
    venue.textContent =
      sourceVenue?.textContent.split(" · ", 1)[0].trim() || "Venue guide";
    meta.append(time, venue);
    card.append(meta);
    return card;
  };

  const renderMatchWindow = (statusFeed) => {
    const statusByNumber = new Map(
      statusFeed.map((match) => [
        Number(match.matchNumber),
        String(match.status || ""),
      ]),
    );
    sourceCards.forEach((card) => {
      const number = matchNumberFrom(card);
      if (!statusByNumber.has(number)) {
        statusByNumber.set(number, scheduledStatusFrom(card));
      }
    });
    let completedInOrder = 0;
    for (let number = 1; number <= sourceCards.length; number += 1) {
      if (!settledStatuses.has(normalizeStatus(statusByNumber.get(number)))) break;
      completedInOrder = number;
    }

    const windowSize = 4;
    const lastStart = Math.floor((sourceCards.length - 1) / 3) * 3;
    const start = Math.min(
      Math.floor(completedInOrder / 3) * 3,
      lastStart,
    );
    const visibleCards = sourceCards.slice(start, start + windowSize);
    const signature = `${start}:${visibleCards
      .map((card) => {
        const number = matchNumberFrom(card);
        return `${number}-${normalizeStatus(statusByNumber.get(number))}`;
      })
      .join("|")}`;
    if (signature === renderedSignature) return;
    renderedSignature = signature;

    const fragment = document.createDocumentFragment();
    visibleCards.forEach((sourceCard) => {
      const number = matchNumberFrom(sourceCard);
      fragment.append(buildWindowCard(sourceCard, statusByNumber.get(number)));
    });
    grid.replaceChildren(fragment);

    const firstNumber = start + 1;
    const lastNumber = Math.min(start + windowSize, sourceCards.length);
    if (badge) {
      badge.textContent =
        completedInOrder === sourceCards.length
          ? "Season complete"
          : "Upcoming matches";
    }
    if (title) {
      title.textContent =
        completedInOrder === sourceCards.length
          ? "CPL 2026 Final Matches"
          : "CPL 2026 Upcoming Matches";
    }
    if (copy) {
      copy.textContent =
        completedInOrder === sourceCards.length
          ? "The final matches remain here after the tournament is complete."
          : "The next four CPL 2026 fixtures are shown below. Once three results are confirmed, the following matches move into view.";
    }
  };

  const refreshMatchWindow = async () => {
    if (!endpoint || !grid || sourceCards.length !== 39 || requestInProgress) return;
    requestInProgress = true;
    try {
      const response = await fetch(endpoint, { cache: "default", priority: "high" });
      if (!response.ok) throw new Error(`Match status request failed: ${response.status}`);
      const statusFeed = await response.json();
      if (!Array.isArray(statusFeed)) throw new Error("Match status response is invalid");
      renderMatchWindow(statusFeed);
    } catch (error) {
      console.warn("CPL homepage match window refresh unavailable", error);
    } finally {
      requestInProgress = false;
    }
  };

  refreshMatchWindow();
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshMatchWindow();
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshMatchWindow();
  });
}

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const contactMessage = contactForm.querySelector("#contact-message");
  const contactMessageCount = document.querySelector("#contact-message-count");
  const contactSuccess = document.querySelector("#contact-success");
  const contactUrl = contactForm.querySelector("#contact-url");
  const contactParams = new URLSearchParams(window.location.search);

  if (contactMessage && contactMessageCount) {
    const updateContactCount = () => {
      contactMessageCount.textContent = `${contactMessage.value.length.toLocaleString()} / 2,000`;
    };
    contactMessage.addEventListener("input", updateContactCount);
    updateContactCount();
  }

  if (contactUrl && document.referrer) {
    const referringUrl = new URL(document.referrer);
    if (referringUrl.origin === window.location.origin && referringUrl.pathname !== window.location.pathname) {
      contactUrl.value = referringUrl.href;
    }
  }

  if (contactSuccess && contactParams.get("sent") === "1") {
    contactSuccess.hidden = false;
    contactSuccess.scrollIntoView({ block: "center" });
    window.history.replaceState({}, "", window.location.pathname);
  }
}

const liveMatchCountdown = document.querySelector("[data-match-countdown]");

if (liveMatchCountdown) {
  const label = liveMatchCountdown.querySelector("[data-match-countdown-label]");
  const fields = {
    days: liveMatchCountdown.querySelector("[data-countdown-days]"),
    hours: liveMatchCountdown.querySelector("[data-countdown-hours]"),
    minutes: liveMatchCountdown.querySelector("[data-countdown-minutes]"),
    seconds: liveMatchCountdown.querySelector("[data-countdown-seconds]"),
  };

  const updateLiveMatchCountdown = () => {
    if (liveMatchCountdown.dataset.matchResolved === "true") return true;
    const targetTime = Date.parse(liveMatchCountdown.dataset.countdownTarget);
    if (!Number.isFinite(targetTime)) return true;
    const remaining = targetTime - Date.now();
    if (remaining <= 0) {
      liveMatchCountdown.classList.add("is-live");
      if (label) label.textContent = "Updating match status…";
      return true;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const values = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
    Object.entries(values).forEach(([unit, value]) => {
      if (fields[unit]) fields[unit].textContent = String(value).padStart(2, "0");
    });
    return true;
  };

  updateLiveMatchCountdown();
  window.setInterval(updateLiveMatchCountdown, 1000);
}

const liveMatchData = document.querySelector("[data-match-live-data]");
const liveMatchHero = document.querySelector("[data-match-hero-hydration]");
const liveMatchRefresh = document.querySelector("[data-match-data-refresh]");
const liveMatchPrestart = document.querySelector("[data-match-prestart]");

if (liveMatchData) {
  const matchNumber = Number(liveMatchData.dataset.matchNumber);
  const matchHome = liveMatchData.dataset.matchHome || "";
  const matchAway = liveMatchData.dataset.matchAway || "";
  const scoreboard = liveMatchData.querySelector("[data-match-scoreboard]");
  const feedState = liveMatchData.querySelector("[data-match-feed-state]");
  const feedStatus = liveMatchData.querySelector("[data-match-feed-status]");
  const summary = liveMatchData.querySelector("[data-match-summary]");
  const toss = liveMatchData.querySelector("[data-match-toss]");
  const fetched = liveMatchData.querySelector("[data-match-fetched]");
  const current = liveMatchData.querySelector("[data-match-current]");
  const batters = liveMatchData.querySelector("[data-match-batters]");
  const bowler = liveMatchData.querySelector("[data-match-bowler]");
  const keyStats = liveMatchData.querySelector("[data-match-key-stats]");
  const recentBalls = liveMatchData.querySelector("[data-match-recent-balls]");
  const matchDataNote = document.querySelector("[data-match-data-note]");
  const heroStatus = document.querySelector("[data-match-hero-status]");
  const liveStream = liveMatchData.querySelector("[data-match-live-stream]");
  const commentaryPanel = document.querySelector("[data-match-commentary-panel]");
  const commentaryStatus = commentaryPanel?.querySelector("[data-commentary-status]");
  const commentarySummary = commentaryPanel?.querySelector("[data-commentary-summary]");
  const commentaryCopy = commentaryPanel?.querySelector("[data-commentary-copy]");
  const commentaryBalls = commentaryPanel?.querySelector("[data-commentary-balls]");
  const commentaryPreview = commentaryPanel?.querySelector("[data-commentary-preview]");
  const commentaryPreviewTeams = commentaryPanel?.querySelector("[data-commentary-preview-teams]");
  const commentaryToss = commentaryPanel?.querySelector("[data-commentary-toss]");
  const commentaryFilters = [...(commentaryPanel?.querySelectorAll("[data-commentary-filter]") || [])];
  const fullScorecard = document.querySelector("[data-full-scorecard]");
  const matchSwitches = [...document.querySelectorAll("[data-match-switch]")];
  const matchPanels = [...document.querySelectorAll("[data-match-panel]")];
  const confirmedXi = document.querySelector("[data-confirmed-xi]");
  const probableXi = document.querySelector("[data-probable-xi]");
  const xiKicker = document.querySelector("[data-xi-kicker]");
  const xiTitle = document.querySelector("[data-xi-title]");
  const xiStatus = document.querySelector("[data-xi-status]");
  const h2h = document.querySelector("[data-match-h2h]");
  const currentStats = {
    status: document.querySelector('[data-current-stat="status"]'),
    score: document.querySelector('[data-current-stat="score"]'),
    runRate: document.querySelector('[data-current-stat="run-rate"]'),
    targetResult: document.querySelector('[data-current-stat="target-result"]'),
  };
  const commentaryHistory = new Map();
  const completePattern = /complete|completed|result|abandon|cancel|no result/i;
  const upcomingPattern = /upcoming|scheduled|fixture|pre-match/i;
  const matchPhase = (match) => match?.stateOfPlay || match?.description || match?.status || "Match in progress";
  const completedResult = (match) => {
    const candidates = [match?.description, match?.stateOfPlay].map((value) => String(value || "").trim());
    const result = candidates.find((value) => value && !/^(complete|completed|match complete|match completed|result)$/i.test(value));
    if (result) return result;
    return match?.winnerName ? `${match.winnerName} won` : "Match completed";
  };
  let pollTimer;
  let completedAwardChecks = 0;
  const maxCompletedAwardChecks = 60;
  let commentaryVisibleCount = 20;
  let commentaryFilter = null;
  let latestCommentaryMatch = null;

  const showMatchPanel = (name, updateHash = true) => {
    matchPanels.forEach((panel) => {
      panel.hidden = panel.dataset.matchPanel !== name;
    });
    matchSwitches.forEach((link) => {
      if (link.dataset.matchSwitch === name) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    const active = matchSwitches.find((link) => link.dataset.matchSwitch === name);
    if (updateHash && active) history.replaceState(null, "", active.getAttribute("href"));
  };

  matchSwitches.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showMatchPanel(link.dataset.matchSwitch);
    });
  });
  const initialPanel = matchSwitches.find(
    (link) => link.getAttribute("href") === window.location.hash,
  );
  showMatchPanel(initialPanel?.dataset.matchSwitch || "live", false);

  const formatScore = (innings) => {
    if (!innings || innings.runs === null) return "Yet to bat";
    return `${innings.runs}${innings.wickets === null ? "" : `/${innings.wickets}`}`;
  };

  const textLine = (label, value) => {
    const node = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = label;
    node.append(strong, document.createTextNode(value));
    return node;
  };

  const renderConfirmedXi = (match) => {
    if (!confirmedXi) return;
    const teams = match?.teams || [];
    const verifiedLineups = Array.isArray(match?.confirmedPlayingXi)
      ? match.confirmedPlayingXi.map((lineup) => ({
          team: teams.find((team) => {
            const current = String(team.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const expected = String(lineup.teamName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return current === expected || current.includes(expected) || expected.includes(current);
          }) || { name: lineup.teamName },
          players: lineup.players || [],
        }))
      : [];
    const lineups = verifiedLineups.length === 2
      ? verifiedLineups
      : (match?.scorecard || []).map((innings) => ({
          team: teams.find((team) => team.id === innings.battingTeamId) || {
            name: innings.battingTeamName,
          },
          players: innings.confirmedPlayers || [],
        }));
    if (lineups.length !== 2 || lineups.some((entry) => entry.players.length < 11)) {
      confirmedXi.replaceChildren();
      confirmedXi.hidden = true;
      if (probableXi) probableXi.hidden = false;
      if (xiKicker) xiKicker.textContent = "05 / Probable XI";
      if (xiTitle) xiTitle.textContent = "Projected playing XIs";
      if (xiStatus) xiStatus.textContent = "These are projections, not confirmed lineups.";
      return;
    }
    const fragment = document.createDocumentFragment();
    lineups.forEach(({ team, players }) => {
      const article = document.createElement("article");
      const header = document.createElement("header");
      if (team.logo) {
        const image = document.createElement("img");
        image.src = team.logo;
        image.alt = `${team.name} logo`;
        image.width = 68;
        image.height = 68;
        header.append(image);
      }
      const heading = document.createElement("h3");
      heading.textContent = team.name;
      header.append(heading);
      const list = document.createElement("ol");
      players.slice(0, 11).forEach((player, index) => {
        const item = document.createElement("li");
        const number = document.createElement("span");
        number.textContent = String(index + 1).padStart(2, "0");
        const name = document.createElement("strong");
        name.textContent = player.name;
        const role = document.createElement("small");
        role.textContent = "Confirmed";
        item.append(number, name, role);
        list.append(item);
      });
      article.append(header, list);
      fragment.append(article);
    });
    confirmedXi.replaceChildren(fragment);
    confirmedXi.hidden = false;
    if (probableXi) probableXi.hidden = true;
    if (xiKicker) xiKicker.textContent = "05 / Confirmed XI";
    if (xiTitle) xiTitle.textContent = "Confirmed playing XIs";
    if (xiStatus) xiStatus.textContent = "Confirmed lineups after the toss.";
  };

  const buildScoreTable = (headers, rows, label) => {
    const table = document.createElement("table");
    table.setAttribute("aria-label", label);
    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach((heading) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = heading;
      headerRow.append(cell);
    });
    head.append(headerRow);
    const body = document.createElement("tbody");
    rows.forEach((values) => {
      const row = document.createElement("tr");
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.textContent = value ?? "—";
        row.append(cell);
      });
      body.append(row);
    });
    table.append(head, body);
    return table;
  };

  const renderFullScorecard = (match) => {
    if (!fullScorecard) return;
    const inningsList = match?.scorecard || [];
    fullScorecard.replaceChildren();
    if (!inningsList.length) {
      const pending = document.createElement("div");
      pending.className = "match-data-pending";
      const title = document.createElement("strong");
      title.textContent = "Scorecard not available yet";
      const copy = document.createElement("p");
      copy.textContent = "Batting and bowling figures will appear when play begins.";
      pending.append(title, copy);
      fullScorecard.append(pending);
      return;
    }
    inningsList.forEach((innings) => {
      const section = document.createElement("article");
      section.className = "match-scorecard-innings";
      const header = document.createElement("header");
      const title = document.createElement("h3");
      title.textContent = `${innings.battingTeamName || `Innings ${innings.inningsNumber}`} innings`;
      const total = document.createElement("strong");
      total.textContent = `${innings.runs ?? 0}/${innings.wickets ?? 0} (${innings.overs ?? 0} ov)`;
      header.append(title, total);
      const batting = buildScoreTable(
        ["Batter", "Dismissal", "R", "B", "4s", "6s", "SR"],
        (innings.batting || []).map((player) => [
          player.name,
          player.dismissal || (player.notOut ? "not out" : ""),
          player.runs,
          player.balls,
          player.fours,
          player.sixes,
          player.strikeRate,
        ]),
        `${innings.battingTeamName} batting scorecard`,
      );
      const extras = document.createElement("p");
      extras.className = "match-scorecard-extras";
      extras.textContent = `Extras ${innings.extras?.total ?? 0} (b ${innings.extras?.byes ?? 0}, lb ${innings.extras?.legByes ?? 0}, nb ${innings.extras?.noBalls ?? 0}, w ${innings.extras?.wides ?? 0})`;
      const bowlingTitle = document.createElement("h4");
      bowlingTitle.textContent = "Bowling";
      const bowling = buildScoreTable(
        ["Bowler", "O", "M", "R", "W", "Econ", "WD", "NB"],
        (innings.bowling || []).map((player) => [
          player.name,
          player.overs,
          player.maidens,
          player.runs,
          player.wickets,
          player.economy,
          player.wides,
          player.noBalls,
        ]),
        `${innings.battingTeamName} opposition bowling figures`,
      );
      const fall = document.createElement("p");
      fall.className = "match-scorecard-fall";
      fall.textContent = (innings.fallOfWickets || []).length
        ? `Fall of wickets: ${innings.fallOfWickets.map((item) => `${item.wicket || "W"} (${item.name}, ${item.over} ov)`).join(", ")}`
        : "Fall of wickets: none";
      section.append(header, batting, extras, bowlingTitle, bowling, fall);
      fullScorecard.append(section);
    });
  };

  const renderFullCommentary = (match, isComplete, isLive) => {
    if (!commentaryBalls) return;
    (match.live?.recentBalls || []).forEach((ball, index) => {
      const key = `${ball.inningsNumber || 0}:${ball.over ?? ""}.${ball.ball ?? ""}:${ball.label || ""}:${index}`;
      commentaryHistory.set(key, ball);
    });
    const balls = Array.isArray(match.commentary) && match.commentary.length
      ? match.commentary
      : [...commentaryHistory.values()].reverse();
    latestCommentaryMatch = { match, isComplete, isLive };
    const inningsNumbers = [...new Set(balls.map((ball) => Number(ball.inningsNumber)).filter(Number.isFinite))].sort((a, b) => a - b);
    if (!commentaryFilter) commentaryFilter = "preview";
    commentaryFilters.forEach((button) => {
      const filter = button.dataset.commentaryFilter;
      button.classList.toggle("is-active", filter === commentaryFilter);
      button.setAttribute("aria-pressed", String(filter === commentaryFilter));
      if (filter !== "preview") button.hidden = !inningsNumbers.includes(Number(filter));
      const innings = match.innings?.find((item) => Number(item.inningsNumber) === Number(filter));
      const team = match.teams?.find((item) => String(item.id) === String(innings?.battingTeamId));
      if (team && filter !== "preview") button.textContent = `${team.shortName || team.name} Innings`;
    });
    const showPreview = commentaryFilter === "preview";
    if (commentaryPreview) commentaryPreview.hidden = !showPreview;
    commentaryBalls.hidden = showPreview;
    if (showPreview) return;
    const filteredBalls = balls.filter((ball) => Number(ball.inningsNumber) === Number(commentaryFilter));
    commentaryBalls.replaceChildren();
    if (!filteredBalls.length) {
      const node = document.createElement("span");
      node.textContent = isComplete ? "Commentary unavailable" : isLive ? "Waiting for next delivery" : "Coverage not started";
      commentaryBalls.append(node);
      return;
    }
    const visibleBalls = filteredBalls.slice(0, commentaryVisibleCount);
    const outcomeValue = (label) => {
      const value = String(label || "").trim();
      if (/^w$/i.test(value)) return 0;
      const runs = value.match(/^\d+/);
      return runs ? Number(runs[0]) : /(?:wide|wd|no.?ball|nb)/i.test(value) ? 1 : 0;
    };
    const appendOverSummary = (overBalls) => {
      const latest = overBalls.find((ball) => Number.isFinite(ball?.score?.runs)) || overBalls[0];
      const chronological = [...overBalls].reverse();
      const card = document.createElement("section");
      card.className = "match-commentary-over-summary";
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = `Over ${Number(overBalls[0].over) + 1}`;
      const score = document.createElement("b");
      score.textContent = Number.isFinite(latest?.score?.runs)
        ? `${latest.score.runs}-${latest.score.wickets ?? 0}`
        : "Over summary";
      const outcomes = document.createElement("span");
      const overRuns = chronological.reduce((total, ball) => total + outcomeValue(ball.label), 0);
      outcomes.textContent = `${chronological.map((ball) => ball.label || "•").join(" ")} (${overRuns} runs)`;
      header.append(title, score, outcomes);
      const details = document.createElement("div");
      details.className = "match-commentary-over-details";
      const batterRuns = new Map();
      chronological.forEach((ball) => {
        if (!ball.batterName) return;
        const batterValue = /^\d+$/.test(String(ball.label || "").trim()) ? Number(ball.label) : 0;
        batterRuns.set(ball.batterName, (batterRuns.get(ball.batterName) || 0) + batterValue);
      });
      const batters = [...batterRuns.keys()].slice(0, 2);
      const bowler = overBalls.find((ball) => ball.bowlerName)?.bowlerName || "";
      const batterText = document.createElement("div");
      batterText.className = "match-commentary-over-batters";
      if (batters.length) {
        batters.forEach((name) => {
          const row = document.createElement("span");
          const player = document.createElement("strong");
          const figure = document.createElement("small");
          const runs = batterRuns.get(name) || 0;
          player.textContent = name;
          figure.textContent = `${runs} ${runs === 1 ? "run" : "runs"} this over`;
          row.append(player, figure);
          batterText.append(row);
        });
      } else {
        batterText.textContent = "Batting update";
      }
      const bowlerText = document.createElement("span");
      const bowlerName = document.createElement("strong");
      const bowlerFigure = document.createElement("small");
      const overWickets = chronological.filter((ball) => /^w$/i.test(String(ball.label || "").trim())).length;
      bowlerName.textContent = bowler || "Bowling update";
      bowlerFigure.textContent = `${overRuns} ${overRuns === 1 ? "run" : "runs"} · ${overWickets} ${overWickets === 1 ? "wicket" : "wickets"}`;
      bowlerText.append(bowlerName, bowlerFigure);
      details.append(batterText, bowlerText);
      const actions = document.createElement("nav");
      actions.setAttribute("aria-label", `Over ${Number(overBalls[0].over) + 1} commentary controls`);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = "Over Summary ›";
      toggle.setAttribute("aria-expanded", "true");
      toggle.addEventListener("click", () => {
        details.hidden = !details.hidden;
        toggle.setAttribute("aria-expanded", String(!details.hidden));
      });
      const viewAll = document.createElement("button");
      viewAll.type = "button";
      viewAll.textContent = "View all overs ›";
      viewAll.addEventListener("click", () => {
        commentaryVisibleCount = filteredBalls.length;
        renderFullCommentary(match, isComplete, isLive);
      });
      actions.append(toggle, viewAll);
      card.append(header, details, actions);
      commentaryBalls.append(card);
    };
    visibleBalls.forEach((ball, index) => {
      const previous = visibleBalls[index - 1];
      const startsOver = ball.over !== null && ball.over !== undefined && Number(ball.over) !== Number(previous?.over);
      const overBalls = visibleBalls.filter((item) => Number(item.over) === Number(ball.over));
      const allOverBalls = filteredBalls.filter((item) => Number(item.over) === Number(ball.over));
      const highestBall = Math.max(...allOverBalls.map((item) => Number(item.ball)).filter(Number.isFinite), 0);
      const laterOverExists = filteredBalls.some((item) => Number(item.over) > Number(ball.over));
      const overComplete = overBalls.length === allOverBalls.length && (highestBall >= 6 || laterOverExists);
      if (startsOver) {
        if (overComplete) appendOverSummary(overBalls);
        const bowler = overBalls.find((item) => item.bowlerName)?.bowlerName;
        if (bowler) {
          const note = document.createElement("p");
          note.className = "match-commentary-note";
          note.textContent = `${bowler} comes into the attack`;
          commentaryBalls.append(note);
        }
      }
      if ((ball.ball === null || ball.ball === undefined || !Number.isFinite(Number(ball.ball))) && (ball.commentary || ball.label)) {
        const note = document.createElement("p");
        note.className = "match-commentary-note";
        note.textContent = ball.commentary || ball.label;
        commentaryBalls.append(note);
        return;
      }
      const node = document.createElement("article");
      const delivery = document.createElement("strong");
      delivery.textContent = ball.over !== null && ball.ball !== null
        ? `${ball.over}.${ball.ball}`
        : "Ball";
      const text = document.createElement("p");
      text.textContent = ball.commentary || ball.label || "Delivery update";
      const outcome = document.createElement("span");
      outcome.textContent = ball.label || "•";
      node.append(delivery, text, outcome);
      commentaryBalls.append(node);
    });
    if (filteredBalls.length > commentaryVisibleCount) {
      const controls = document.createElement("div");
      controls.className = "match-commentary-load-more";
      const count = document.createElement("span");
      count.textContent = `Showing ${commentaryVisibleCount} of ${filteredBalls.length} deliveries`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Load more commentary";
      button.addEventListener("click", () => {
        commentaryVisibleCount = Math.min(commentaryVisibleCount + 20, filteredBalls.length);
        renderFullCommentary(match, isComplete, isLive);
      });
      controls.append(count, button);
      commentaryBalls.append(controls);
    }
  };

  commentaryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      commentaryFilter = button.dataset.commentaryFilter;
      commentaryVisibleCount = 20;
      if (latestCommentaryMatch) renderFullCommentary(latestCommentaryMatch.match, latestCommentaryMatch.isComplete, latestCommentaryMatch.isLive);
    });
  });

  const renderLiveStream = (match, isComplete, isLive) => {
    if (!liveStream) return;
    liveStream.replaceChildren();
    const commentary = Array.isArray(match.commentary) ? match.commentary : [];
    const recent = commentary.length ? commentary.slice(0, 60) : (match.live?.recentBalls || []).slice().reverse();
    const performers = [
      match.topPerformers?.mostRuns ? `Top scorer: ${match.topPerformers.mostRuns.name} · ${match.topPerformers.mostRuns.value ?? "—"} runs` : "",
      match.topPerformers?.mostWickets ? `Top bowler: ${match.topPerformers.mostWickets.name} · ${match.topPerformers.mostWickets.value ?? "—"} wickets` : "",
    ].filter(Boolean);

    const verifiedPlayerOfMatch = match?.playerOfMatch?.name ? match.playerOfMatch : null;

    if (verifiedPlayerOfMatch?.name) {
      const award = document.createElement("article");
      award.className = "match-live-award";
      if (verifiedPlayerOfMatch.image) {
        const image = document.createElement("img");
        image.src = verifiedPlayerOfMatch.image;
        image.alt = verifiedPlayerOfMatch.name;
        image.width = 48;
        image.height = 48;
        award.append(image);
      }
      const copy = document.createElement("div");
      const label = document.createElement("small");
      label.textContent = "Player of the match";
      const name = document.createElement("strong");
      name.textContent = verifiedPlayerOfMatch.name;
      copy.append(label, name);
      if (verifiedPlayerOfMatch.detail) {
        const detail = document.createElement("span");
        detail.textContent = verifiedPlayerOfMatch.detail;
        copy.append(detail);
      }
      award.append(copy);
      liveStream.append(award);
    }

    if (isComplete || performers.length) {
      const recap = document.createElement("article");
      recap.className = "match-live-recap";
      const heading = document.createElement("strong");
      heading.textContent = match.description || match.stateOfPlay || "Match complete";
      recap.append(heading);
      performers.forEach((line) => {
        const item = document.createElement("p");
        item.textContent = line;
        recap.append(item);
      });
      liveStream.append(recap);
    }

    if (!recent.length) {
      if (isLive) {
        const waiting = document.createElement("p");
        waiting.className = "match-live-stream-empty";
        waiting.textContent = "Waiting for the next delivery.";
        liveStream.append(waiting);
      }
      liveStream.hidden = !liveStream.childElementCount;
      return;
    }

    const groups = new Map();
    recent.forEach((ball) => {
      const over = Number.isFinite(ball.over) ? String(ball.over) : "Current over";
      if (!groups.has(over)) groups.set(over, []);
      groups.get(over).push(ball);
    });
    [...groups.entries()].slice(0, 8).forEach(([over, balls]) => {
      const section = document.createElement("section");
      section.className = "match-live-over";
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = over === "Current over" ? over : `Over ${Number(over) + 1}`;
      const latest = balls.find((ball) => Number.isFinite(ball?.score?.runs)) || balls[0];
      const score = document.createElement("b");
      score.textContent = Number.isFinite(latest?.score?.runs)
        ? `${latest.score.runs}-${latest.score.wickets ?? 0}`
        : "Over complete";
      const outcomes = document.createElement("span");
      outcomes.textContent = balls.slice().reverse().map((ball) => ball.label || "•").join(" ");
      header.append(title, score, outcomes);
      const list = document.createElement("div");
      balls.forEach((ball) => {
        const row = document.createElement("article");
        const delivery = document.createElement("strong");
        delivery.textContent = Number.isFinite(ball.over) && Number.isFinite(ball.ball) ? `${ball.over}.${ball.ball}` : "Ball";
        const text = document.createElement("p");
        text.textContent = ball.commentary || ball.label || "Delivery update";
        const outcome = document.createElement("span");
        outcome.textContent = ball.label || "•";
        row.append(delivery, text, outcome);
        list.append(row);
      });
      const overComplete = balls.some((ball) => Number(ball.ball) === 6) || [...groups.keys()][0] !== over;
      section.append(list);
      if (overComplete) section.append(header);
      liveStream.append(section);
    });
    liveStream.hidden = false;
  };

  const setLiveStat = (element, value) => {
    if (!element || value === null || value === undefined) return;
    element.hidden = false;
    const output = element.querySelector("[data-live-stat-value]");
    if (output) output.textContent = String(value);
  };

  const renderMatch = (match, fetchedAt) => {
    const status = String(match.status || "Scheduled");
    const isComplete = completePattern.test(status);
    const isUpcoming = upcomingPattern.test(status);
    const isLive = !isComplete && !isUpcoming;
    liveMatchData.dataset.feedMode = isComplete ? "complete" : isLive ? "live" : "upcoming";
    const heroCountdownLabel = liveMatchCountdown?.querySelector("[data-match-countdown-label]");
    if (heroStatus) {
      heroStatus.lastChild.textContent = ` ${isComplete ? "Completed" : isLive ? matchPhase(match) : "Scheduled"}`;
      heroStatus.dataset.matchState = isComplete ? "complete" : isLive ? "live" : "upcoming";
    }
    if (liveMatchCountdown) {
      liveMatchCountdown.dataset.matchResolved = String(!isUpcoming);
      liveMatchCountdown.classList.toggle("is-complete", isComplete);
      liveMatchCountdown.classList.toggle("is-live", isLive);
      Object.values({
        days: liveMatchCountdown.querySelector("[data-countdown-days]"),
        hours: liveMatchCountdown.querySelector("[data-countdown-hours]"),
        minutes: liveMatchCountdown.querySelector("[data-countdown-minutes]"),
        seconds: liveMatchCountdown.querySelector("[data-countdown-seconds]"),
      }).forEach((field) => {
        if (field?.parentElement) field.parentElement.hidden = !isUpcoming;
      });
    }
    if (heroCountdownLabel) {
      heroCountdownLabel.textContent = isComplete
        ? completedResult(match)
        : isLive
          ? match.chaseEquation || (/^live$/i.test(String(matchPhase(match))) ? "Match in progress" : matchPhase(match))
          : "Match Starts in";
    }
    if (feedState) feedState.textContent = isComplete ? "Result confirmed" : isLive ? matchPhase(match) : "Scheduled";
    const summaryText = isComplete ? completedResult(match) : (match.chaseEquation || match.stateOfPlay || match.description || (isLive ? "Match in progress" : "Match scheduled"));
    summary.textContent = isComplete ? "Match result" : summaryText;
    if (matchDataNote) matchDataNote.hidden = !isUpcoming;
    if (commentaryStatus) commentaryStatus.textContent = isComplete ? "Complete ball-by-ball commentary" : isLive ? matchPhase(match) : "Commentary begins when match coverage starts.";
    if (commentarySummary) commentarySummary.textContent = summaryText;
    if (commentaryCopy) commentaryCopy.textContent = match.description || (isComplete ? "The result and every available delivery are shown here." : isLive ? "Follow the latest state of play." : "The toss and full commentary will appear as the match develops.");
    if (commentaryToss) commentaryToss.textContent = match.toss || "Awaiting confirmation";
    if (commentaryPreviewTeams) {
      commentaryPreviewTeams.replaceChildren();
      (match.confirmedPlayingXi || []).forEach((lineup) => {
        const row = document.createElement("p");
        const name = document.createElement("strong");
        name.textContent = `${lineup.teamName} (Playing XI): `;
        row.append(name, document.createTextNode((lineup.players || []).map((player) => player.name).join(", ")));
        commentaryPreviewTeams.append(row);
      });
    }
    renderFullScorecard(match);
    renderConfirmedXi(match);
    renderFullCommentary(match, isComplete, isLive);
    renderLiveStream(match, isComplete, isLive);

    if (currentStats.status) currentStats.status.textContent = status;
    const currentInnings = (match.innings || []).slice(-1)[0];
    if (currentStats.score) {
      currentStats.score.textContent = currentInnings
        ? `${currentInnings.runs ?? 0}/${currentInnings.wickets ?? 0} (${currentInnings.overs ?? 0} ov)`
        : "Yet to start";
    }
    if (currentStats.runRate) {
      currentStats.runRate.textContent = match.live?.currentRunRate ?? currentInnings?.runRate ?? "—";
    }
    if (currentStats.targetResult) {
      currentStats.targetResult.textContent = isComplete
        ? match.description || summaryText
        : Number.isFinite(match.live?.target)
          ? `Target ${match.live.target}`
          : match.toss || "—";
    }

    if (isUpcoming && !match.innings?.length && !match.toss) {
      scoreboard.hidden = true;
      if (liveMatchPrestart) liveMatchPrestart.hidden = false;
      if (liveMatchRefresh) liveMatchRefresh.disabled = false;
      liveMatchData.dataset.hydrationState = "ready";
      if (liveMatchHero) liveMatchHero.dataset.matchHeroHydration = "ready";
      return;
    }

    if (liveMatchPrestart) liveMatchPrestart.hidden = true;
    scoreboard.hidden = false;
    (match.teams || []).slice(0, 2).forEach((team, index) => {
      const label = scoreboard.querySelector(`[data-match-team-label="${index}"]`);
      if (label && team.name) label.textContent = team.name;
      const teamInnings = (match.innings || []).filter((entry) => entry.battingTeamId === team.id);
      const latestInnings = teamInnings[teamInnings.length - 1];
      const score = scoreboard.querySelector(`[data-match-team-score="${index}"]`);
      const overs = scoreboard.querySelector(`[data-match-team-overs="${index}"]`);
      if (score) score.textContent = formatScore(latestInnings);
      if (overs) overs.textContent = latestInnings?.overs === null || latestInnings?.overs === undefined ? "" : `${latestInnings.overs} overs`;
    });

    if (isComplete) {
      toss.textContent = completedResult(match);
      toss.hidden = false;
    } else if (match.chaseEquation) {
      toss.hidden = true;
    } else if (match.toss) {
      toss.textContent = match.toss;
      toss.hidden = false;
    } else {
      toss.hidden = true;
    }

    if (h2h && match.seasonHeadToHead && Number(h2h.dataset.baseMatches || 0) === 0) {
      h2h.querySelector("[data-h2h-matches]").textContent = String(match.seasonHeadToHead.matches || 0);
      h2h.querySelector("[data-h2h-home-wins]").textContent = String(match.seasonHeadToHead.homeWins || 0);
      h2h.querySelector("[data-h2h-away-wins]").textContent = String(match.seasonHeadToHead.awayWins || 0);
      h2h.querySelector("[data-h2h-through]").textContent = `Through ${match.seasonHeadToHead.through || "CPL 2026"}`;
    }

    if (h2h && isComplete && match.winnerName) {
      const baseMatches = Number(h2h.dataset.baseMatches || 0);
      const baseHomeWins = Number(h2h.dataset.baseHomeWins || 0);
      const baseAwayWins = Number(h2h.dataset.baseAwayWins || 0);
      const winner = match.winnerName.toLowerCase();
      const homeWon = winner.includes(String(h2h.dataset.homeName || "").toLowerCase());
      const awayWon = winner.includes(String(h2h.dataset.awayName || "").toLowerCase());
      if (homeWon || awayWon) {
        h2h.querySelector("[data-h2h-matches]").textContent = String(baseMatches + 1);
        h2h.querySelector("[data-h2h-home-wins]").textContent = String(baseHomeWins + (homeWon ? 1 : 0));
        h2h.querySelector("[data-h2h-away-wins]").textContent = String(baseAwayWins + (awayWon ? 1 : 0));
        h2h.querySelector("[data-h2h-through]").textContent = "Including this match";
      }
    }

    batters.replaceChildren();
    const batterRows = (match.live?.batters || []).map((player) => [
      `${player.name || "Batter"}${player.notOut ? " *" : ""}`,
      player.runs ?? 0,
      player.balls ?? 0,
      player.fours ?? 0,
      player.sixes ?? 0,
      player.strikeRate ?? "—",
    ]);
    const makeLiveTable = (headers, rows) => {
      const table = document.createElement("table");
      table.className = "match-live-data-table";
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      headers.forEach((value) => {
        const cell = document.createElement("th");
        cell.textContent = value;
        headRow.append(cell);
      });
      head.append(headRow);
      const body = document.createElement("tbody");
      rows.forEach((values) => {
        const row = document.createElement("tr");
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        body.append(row);
      });
      table.append(head, body);
      return table;
    };
    if (batterRows.length) batters.append(makeLiveTable(["Batter", "R", "B", "4s", "6s", "SR"], batterRows));
    bowler.replaceChildren();
    if (match.live?.bowler?.name) {
      const player = match.live.bowler;
      const currentCard = (match.scorecard || []).slice(-1)[0];
      const otherBowler = (currentCard?.bowling || []).filter((item) => item.name !== player.name && Number(item.overs) > 0).slice(-1)[0];
      const bowlingRows = [player, otherBowler].filter(Boolean).map((item) => [
        item.name,
        item.overs ?? "—",
        item.maidens ?? 0,
        item.runs ?? item.runsConceded ?? 0,
        item.wickets ?? 0,
        item.economy ?? "—",
      ]);
      bowler.append(makeLiveTable(["Bowler", "O", "M", "R", "W", "ECO"], bowlingRows));
    }
    if (keyStats) {
      keyStats.replaceChildren();
      const keyStatsTitle = document.createElement("h3");
      keyStatsTitle.className = "match-live-block-title";
      keyStatsTitle.textContent = "Key Stats";
      const commentary = Array.isArray(match.commentary) ? match.commentary : [];
      const currentInnings = (match.innings || []).slice(-1)[0];
      const lastWicketIndex = commentary.findIndex((ball) => /^w$/i.test(String(ball.label || "")));
      const lastWicket = lastWicketIndex >= 0 ? commentary[lastWicketIndex] : null;
      const currentRuns = Number(currentInnings?.runs);
      const wicketRuns = Number(lastWicket?.score?.runs);
      const partnershipRuns = Number.isFinite(currentRuns) && Number.isFinite(wicketRuns) ? Math.max(0, currentRuns - wicketRuns) : null;
      const partnershipBalls = lastWicketIndex > 0
        ? commentary.slice(0, lastWicketIndex).filter((ball) => !/w|nb/i.test(String(ball.label || ""))).length
        : 0;
      const stats = [
        ["Partnership", partnershipRuns === null ? "—" : `${partnershipRuns} (${partnershipBalls})`],
        ["Last wicket", lastWicket ? `${lastWicket.batterName || "Wicket"} · ${lastWicket.score?.runs ?? "—"}/${lastWicket.score?.wickets ?? "—"} in ${lastWicket.over}.${lastWicket.ball} ov` : "—"],
        ["Current run rate", match.live?.currentRunRate ?? currentInnings?.runRate ?? "—"],
        ["Required run rate", match.live?.requiredRunRate ?? "—"],
        ["Toss", match.toss || "Awaiting confirmation"],
      ];
      const list = document.createElement("dl");
      list.className = "match-live-key-list";
      stats.forEach(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = label;
        detail.textContent = value;
        row.append(term, detail);
        list.append(row);
      });
      keyStats.append(keyStatsTitle, list);
    }
    recentBalls.replaceChildren();
    const recentBallsTitle = document.createElement("h3");
    recentBallsTitle.className = "match-live-block-title";
    recentBallsTitle.textContent = "Recent Balls";
    recentBalls.append(recentBallsTitle);
    (match.live?.recentBalls || []).forEach((ball) => {
      const node = document.createElement("span");
      node.textContent = ball.label || "•";
      recentBalls.append(node);
    });
    if (false && commentaryBalls) {
      const balls = match.live?.recentBalls || [];
      balls.forEach((ball) => {
        const key = `${ball.over ?? ""}.${ball.ball ?? ""}:${ball.label || ""}`;
        commentaryHistory.set(key, ball);
      });
      commentaryBalls.replaceChildren();
      if (commentaryHistory.size) {
        [...commentaryHistory.values()].slice(-24).reverse().forEach((ball) => {
          const node = document.createElement("article");
          const delivery = document.createElement("strong");
          delivery.textContent = ball.over !== null && ball.ball !== null ? `${ball.over}.${ball.ball}` : "Ball";
          const text = document.createElement("p");
          text.textContent = ball.commentary || ball.label || "Delivery update";
          const outcome = document.createElement("span");
          outcome.textContent = ball.label || "•";
          node.append(delivery, text, outcome);
          commentaryBalls.append(node);
        });
      } else {
        const node = document.createElement("span");
        node.textContent = isComplete ? "FT" : isLive ? "Live" : "Upcoming";
        commentaryBalls.append(node);
      }
    }
    current.hidden = !(batters.childElementCount || bowler.childElementCount || recentBalls.childElementCount);
    fetched.textContent = `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
    if (liveMatchRefresh) liveMatchRefresh.disabled = false;
    liveMatchData.dataset.hydrationState = "ready";
    if (liveMatchHero) liveMatchHero.dataset.matchHeroHydration = "ready";
  };

  const loadMatch = async () => {
    if (!Number.isFinite(matchNumber)) return;
    if (liveMatchRefresh) liveMatchRefresh.disabled = true;
    if (feedStatus) feedStatus.textContent = "Checking the latest match update…";
    try {
      const matchQuery = new URLSearchParams({
        match: String(matchNumber),
        home: matchHome,
        away: matchAway,
      });
      const response = await fetch(`/api/cpl-live-score?${matchQuery}`, { cache: "default", priority: "high" });
      if (!response.ok) throw new Error("Score unavailable");
      const payload = await response.json();
      if (!payload.match || payload.source !== "official-cpl-mcpro") throw new Error("Unverified response");
      renderMatch(payload.match, payload.fetchedAt);
      window.clearTimeout(pollTimer);
      const status = String(payload.match.status || "");
        const isComplete = completePattern.test(status);
        const awardMissing = isComplete && !payload.match?.playerOfMatch?.name;
        if (!isComplete) {
          completedAwardChecks = 0;
          pollTimer = window.setTimeout(loadMatch, upcomingPattern.test(status) ? 60000 : 15000);
        } else if (awardMissing && completedAwardChecks < maxCompletedAwardChecks) {
          completedAwardChecks += 1;
          pollTimer = window.setTimeout(loadMatch, 30000);
        }
    } catch {
      if (feedState) feedState.textContent = "Update delayed";
      if (feedStatus) feedStatus.textContent = "Live scores are temporarily delayed. Match details remain available.";
      liveMatchData.dataset.hydrationState = "ready";
      if (liveMatchHero) liveMatchHero.dataset.matchHeroHydration = "ready";
      if (liveMatchRefresh) liveMatchRefresh.disabled = false;
      window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(loadMatch, 30000);
    }
  };

  if (liveMatchRefresh) liveMatchRefresh.addEventListener("click", loadMatch);
  loadMatch();
}

const homePlayerGrid = document.querySelector("[data-home-player-grid]");
if (homePlayerGrid) {
  const renderRandomPlayers = async () => {
    try {
      const response = await fetch("/static/home-player-pool.json", { cache: "no-cache" });
      if (!response.ok) return;
      const players = await response.json();
      if (!Array.isArray(players) || players.length < 8) return;
      const shuffled = [...players];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
      }
      const fragment = document.createDocumentFragment();
      shuffled.slice(0, 8).forEach((player, index) => {
        const card = document.createElement("a");
        card.className = "home-player-card";
        card.href = `/player/${player.slug}/`;
        const number = document.createElement("span");
        number.className = "home-player-number";
        number.setAttribute("aria-hidden", "true");
        number.textContent = String(index + 1).padStart(2, "0");
        const media = document.createElement("div");
        media.className = "home-player-media";
        const image = document.createElement("img");
        image.src = player.image;
        image.alt = `${player.name} official CPL player photo`;
        image.loading = "lazy";
        image.decoding = "async";
        media.append(image);
        const copy = document.createElement("div");
        copy.className = "home-player-copy";
        const category = document.createElement("span");
        category.textContent = player.category;
        const heading = document.createElement("h3");
        heading.textContent = player.name;
        const team = document.createElement("small");
        team.textContent = player.team;
        copy.append(category, heading, team);
        card.append(number, media, copy);
        fragment.append(card);
      });
      homePlayerGrid.replaceChildren(fragment);
    } catch {
      // Keep the server-rendered eight-player selection as a stable fallback.
    }
  };
  renderRandomPlayers();
}

document.querySelectorAll("[data-teams-faq]").forEach((accordion) => {
  const items = [...accordion.querySelectorAll("details")];
  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      items.forEach((otherItem) => {
        if (otherItem !== item) otherItem.open = false;
      });
    });
  });
});


// CPL match preview links: Matches 5-35.
(() => {
  const matchSlug = window.location.pathname.match(/^\/match\/([^/]+)\/?$/)?.[1];
  const previewMatches = new Map([["antigua-barbuda-falcons-vs-barbados-tridents","antigua-barbuda-falcons-vs-barbados-tridents"],["antigua-barbuda-falcons-vs-guyana-amazon-warriors","antigua-barbuda-falcons-vs-guyana-amazon-warriors"],["antigua-barbuda-falcons-vs-st-kitts-nevis-patriots","antigua-barbuda-falcons-vs-st-kitts-nevis-patriots"],["antigua-barbuda-falcons-vs-trinbago-knight-riders","antigua-barbuda-falcons-vs-trinbago-knight-riders"],["barbados-tridents-vs-guyana-amazon-warriors","barbados-tridents-vs-guyana-amazon-warriors"],["barbados-tridents-vs-jamaica-kingsmen","barbados-tridents-vs-jamaica-kingsmen"],["barbados-tridents-vs-saint-lucia-kings","barbados-tridents-vs-saint-lucia-kings"],["barbados-tridents-vs-st-kitts-nevis-patriots","barbados-tridents-vs-st-kitts-nevis-patriots"],["barbados-tridents-vs-trinbago-knight-riders","barbados-tridents-vs-trinbago-knight-riders"],["guyana-amazon-warriors-vs-antigua-barbuda-falcons","guyana-amazon-warriors-vs-antigua-barbuda-falcons"],["guyana-amazon-warriors-vs-jamaica-kingsmen","guyana-amazon-warriors-vs-jamaica-kingsmen"],["guyana-amazon-warriors-vs-saint-lucia-kings","guyana-amazon-warriors-vs-saint-lucia-kings"],["guyana-amazon-warriors-vs-st-kitts-nevis-patriots","guyana-amazon-warriors-vs-st-kitts-nevis-patriots"],["guyana-amazon-warriors-vs-trinbago-knight-riders","guyana-amazon-warriors-vs-trinbago-knight-riders"],["jamaica-kingsmen-vs-guyana-amazon-warriors","jamaica-kingsmen-vs-guyana-amazon-warriors"],["jamaica-kingsmen-vs-st-kitts-nevis-patriots","jamaica-kingsmen-vs-st-kitts-nevis-patriots"],["jamaica-kingsmen-vs-trinbago-knight-riders","jamaica-kingsmen-vs-trinbago-knight-riders"],["saint-lucia-kings-vs-antigua-barbuda-falcons","saint-lucia-kings-vs-antigua-barbuda-falcons"],["saint-lucia-kings-vs-barbados-tridents","saint-lucia-kings-vs-barbados-tridents"],["saint-lucia-kings-vs-guyana-amazon-warriors","saint-lucia-kings-vs-guyana-amazon-warriors"],["saint-lucia-kings-vs-jamaica-kingsmen","saint-lucia-kings-vs-jamaica-kingsmen"],["saint-lucia-kings-vs-st-kitts-nevis-patriots","saint-lucia-kings-vs-st-kitts-nevis-patriots"],["st-kitts-nevis-patriots-vs-antigua-barbuda-falcons","st-kitts-nevis-patriots-vs-antigua-barbuda-falcons"],["st-kitts-nevis-patriots-vs-barbados-tridents","st-kitts-nevis-patriots-vs-barbados-tridents"],["st-kitts-nevis-patriots-vs-jamaica-kingsmen","st-kitts-nevis-patriots-vs-jamaica-kingsmen"],["st-kitts-nevis-patriots-vs-saint-lucia-kings","st-kitts-nevis-patriots-vs-saint-lucia-kings"],["trinbago-knight-riders-vs-antigua-barbuda-falcons","trinbago-knight-riders-vs-antigua-barbuda-falcons"],["trinbago-knight-riders-vs-barbados-tridents","trinbago-knight-riders-vs-barbados-tridents"],["trinbago-knight-riders-vs-guyana-amazon-warriors","trinbago-knight-riders-vs-guyana-amazon-warriors"],["trinbago-knight-riders-vs-jamaica-kingsmen","trinbago-knight-riders-vs-jamaica-kingsmen"],["trinbago-knight-riders-vs-saint-lucia-kings","trinbago-knight-riders-vs-saint-lucia-kings"]]);
  const previewSlug = previewMatches.get(matchSlug);
  if (!previewSlug) return;
  const previewCopy = document.querySelector("#match-preview > div");
  if (!previewCopy || previewCopy.querySelector(".match-live-preview-link")) return;
  const link = document.createElement("a");
  link.className = "match-live-preview-link";
  link.href = `/match-preview/${previewSlug}-cpl-2026/`;
  link.innerHTML = 'Full match preview <span aria-hidden="true">→</span>';
  previewCopy.append(link);
})();
