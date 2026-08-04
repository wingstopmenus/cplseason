const toggle = document.querySelector(".nav-toggle"); const nav = document.querySelector("#site-nav"); if (toggle && nav) { toggle.addEventListener("click", () => { const isOpen = nav.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", String(isOpen)); }); } const backToTop = document.querySelector(".back-to-top"); if (backToTop) { const setBackToTopState = () => { const isVisible = window.scrollY > 420; backToTop.classList.toggle("is-visible", isVisible); backToTop.setAttribute("aria-hidden", String(!isVisible)); backToTop.tabIndex = isVisible ? 0 : -1; }; backToTop.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); }); setBackToTopState(); window.addEventListener("scroll", setBackToTopState, { passive: true }); } const matchSlider = document.querySelector("#home-match-slider"); const matchSliderButtons = document.querySelectorAll("[data-match-slider]"); if (matchSlider && matchSliderButtons.length) { matchSliderButtons.forEach((button) => { button.addEventListener("click", () => { const direction = button.dataset.matchSlider === "previous" ? -1 : 1; const card = matchSlider.querySelector(".match-rail-card"); const gap = 14; const distance = card ? card.getBoundingClientRect().width + gap : matchSlider.clientWidth; matchSlider.scrollLeft += direction * distance; }); }); } const scheduleVenueFilter = document.querySelector("#schedule-venue-filter"); const scheduleTeamFilter = document.querySelector("#schedule-team-filter"); const scheduleMatchCards = document.querySelectorAll("[data-schedule-match]"); const scheduleFilterCount = document.querySelector("#schedule-filter-count"); const scheduleEmptyState = document.querySelector("#schedule-empty-state"); const scheduleStageHeading = document.querySelector("[data-schedule-stage-heading]"); if (scheduleMatchCards.length && scheduleVenueFilter && scheduleTeamFilter) { const updateScheduleFilters = () => { const venue = scheduleVenueFilter.value; const team = scheduleTeamFilter.value; let visibleMatches = 0; scheduleMatchCards.forEach((card) => { const teamSlugs = card.dataset.teamSlugs.trim().split(/\s+/).filter(Boolean); const venueMatches = !venue || card.dataset.venueSlug === venue; const teamMatches = !team || teamSlugs.includes(team); const isVisible = venueMatches && teamMatches; card.hidden = !isVisible; if (isVisible) { visibleMatches += 1; } }); if (scheduleFilterCount) { scheduleFilterCount.textContent = `${visibleMatches} ${visibleMatches === 1 ? "match" : "matches"}`; } if (scheduleEmptyState) { scheduleEmptyState.hidden = visibleMatches !== 0; } if (scheduleStageHeading) { const hasVisiblePlayoff = [...scheduleMatchCards].some( (card) => !card.hidden && card.dataset.stage !== "League", ); scheduleStageHeading.hidden = !hasVisiblePlayoff; } }; scheduleVenueFilter.addEventListener("change", updateScheduleFilters); scheduleTeamFilter.addEventListener("change", updateScheduleFilters); }

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
        fetch("/api/cpl-matches", { cache: "no-store" }),
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
const playerCategoryButtons = document.querySelectorAll("button[data-player-filter]");
const playerTeamButtons = document.querySelectorAll(".player-team-filter button[data-player-team]");
const playerTeamSections = document.querySelectorAll("[data-player-team-section]");
const playerDirectoryCount = document.querySelector("#player-directory-count");
const playerDirectoryEmpty = document.querySelector("#player-directory-empty");

if (playerDirectorySearch && playerDirectoryCards.length) {
  let activePlayerCategory = "all";
  let activePlayerTeam = "all";

  const updatePlayerDirectory = () => {
    const query = playerDirectorySearch.value.trim().toLowerCase();
    let visiblePlayers = 0;

    playerDirectoryCards.forEach((card) => {
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
      const isVisible = matchesQuery && matchesCategory && matchesTeam;
      card.hidden = !isVisible;
      if (isVisible) visiblePlayers += 1;
    });

    playerTeamSections.forEach((section) => {
      const hasVisiblePlayers = [...section.querySelectorAll("[data-directory-player]")]
        .some((card) => !card.hidden);
      section.hidden = !hasVisiblePlayers;
    });

    if (playerDirectoryCount) {
      playerDirectoryCount.textContent =
        `${visiblePlayers} ${visiblePlayers === 1 ? "player" : "players"} shown`;
    }
    if (playerDirectoryEmpty) playerDirectoryEmpty.hidden = visiblePlayers !== 0;
  };

  playerDirectorySearch.addEventListener("input", updatePlayerDirectory);
  playerCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activePlayerCategory = button.dataset.playerFilter;
      playerCategoryButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("is-active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      updatePlayerDirectory();
    });
  });
  playerTeamButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activePlayerTeam = button.dataset.playerTeam;
      playerTeamButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("is-active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      updatePlayerDirectory();
    });
  });
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
      const response = await fetch(endpoint, { cache: "no-store" });
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
  const targetTime = Date.parse(liveMatchCountdown.dataset.countdownTarget);
  const label = liveMatchCountdown.querySelector("[data-match-countdown-label]");
  const fields = {
    days: liveMatchCountdown.querySelector("[data-countdown-days]"),
    hours: liveMatchCountdown.querySelector("[data-countdown-hours]"),
    minutes: liveMatchCountdown.querySelector("[data-countdown-minutes]"),
    seconds: liveMatchCountdown.querySelector("[data-countdown-seconds]"),
  };

  const updateLiveMatchCountdown = () => {
    const remaining = targetTime - Date.now();
    if (remaining <= 0) {
      liveMatchCountdown.classList.add("is-live");
      if (label) label.textContent = "Match window open · live data appears above";
      return false;
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

  if (Number.isFinite(targetTime) && updateLiveMatchCountdown()) {
    const timer = window.setInterval(() => {
      if (!updateLiveMatchCountdown()) window.clearInterval(timer);
    }, 1000);
  }
}

const liveMatchData = document.querySelector("[data-match-live-data]");
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
  const recentBalls = liveMatchData.querySelector("[data-match-recent-balls]");
  const commentaryPanel = document.querySelector("[data-match-commentary-panel]");
  const commentaryStatus = commentaryPanel?.querySelector("[data-commentary-status]");
  const commentarySummary = commentaryPanel?.querySelector("[data-commentary-summary]");
  const commentaryCopy = commentaryPanel?.querySelector("[data-commentary-copy]");
  const commentaryBalls = commentaryPanel?.querySelector("[data-commentary-balls]");
  const confirmedXi = document.querySelector("[data-confirmed-xi]");
  const probableXi = document.querySelector("[data-probable-xi]");
  const xiKicker = document.querySelector("[data-xi-kicker]");
  const xiTitle = document.querySelector("[data-xi-title]");
  const xiStatus = document.querySelector("[data-xi-status]");
  const h2h = document.querySelector("[data-match-h2h]");
  const liveStats = {
    runRate: document.querySelector('[data-live-stat="run-rate"]'),
    requiredRate: document.querySelector('[data-live-stat="required-rate"]'),
    target: document.querySelector('[data-live-stat="target"]'),
  };
  const commentaryHistory = new Map();
  const completePattern = /complete|completed|result|abandon|cancel|no result/i;
  const upcomingPattern = /upcoming|scheduled|fixture|pre-match/i;
  let pollTimer;

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

  const renderConfirmedXi = (teams = []) => {
    if (!confirmedXi) return;
    const lineups = teams.map((team) => ({
      team,
      players: (team.players || []).filter((player) => !player.substitute),
    }));
    if (lineups.length !== 2 || lineups.some((entry) => entry.players.length < 11)) return;
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
        role.textContent = [player.captain ? "Captain" : "", player.wicketKeeper ? "WK" : ""].filter(Boolean).join(" · ");
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
    if (xiStatus) xiStatus.textContent = "Official lineups after the toss.";
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
    feedState.textContent = isComplete ? "Result confirmed" : isLive ? "Live now" : "Scheduled";
    feedStatus.textContent = isComplete
      ? "The official feed has confirmed the match result."
      : isLive
        ? "Scores refresh automatically every 15 seconds."
        : "Live scores will appear when official match coverage begins.";

    if (isUpcoming && !match.innings?.length && !match.toss) {
      scoreboard.hidden = true;
      if (liveMatchPrestart) liveMatchPrestart.hidden = false;
      if (liveMatchRefresh) liveMatchRefresh.disabled = false;
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

    summary.textContent = match.stateOfPlay || match.description || (isComplete ? "Match complete" : "Match in progress");
    if (commentaryStatus) commentaryStatus.textContent = isComplete ? "Final match summary" : isLive ? "Updating with the live score feed" : "Commentary begins when match coverage goes live.";
    if (commentarySummary) commentarySummary.textContent = summary.textContent;
    if (commentaryCopy) commentaryCopy.textContent = match.description || (isComplete ? "The confirmed result and final scores are shown above." : isLive ? "The latest state of play is synchronized with the match centre." : "Pre-match updates, the toss and key moments will appear here as the match develops.");
    if (match.toss) {
      toss.textContent = match.toss;
      toss.hidden = false;
    } else {
      toss.hidden = true;
    }
    renderConfirmedXi(match.teams || []);
    setLiveStat(liveStats.runRate, match.live?.currentRunRate);
    setLiveStat(liveStats.requiredRate, match.live?.requiredRunRate);
    setLiveStat(liveStats.target, match.live?.target);

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
    (match.live?.batters || []).forEach((player) => {
      batters.append(textLine(player.name || "Batter", ` ${player.runs ?? 0} (${player.balls ?? 0})`));
    });
    bowler.replaceChildren();
    if (match.live?.bowler?.name) {
      bowler.append(textLine(match.live.bowler.name, ` ${match.live.bowler.wickets ?? 0}/${match.live.bowler.runsConceded ?? 0}`));
    }
    recentBalls.replaceChildren();
    (match.live?.recentBalls || []).forEach((ball) => {
      const node = document.createElement("span");
      node.textContent = ball.label || "•";
      recentBalls.append(node);
    });
    if (commentaryBalls) {
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
  };

  const loadMatch = async () => {
    if (!Number.isFinite(matchNumber)) return;
    if (liveMatchRefresh) liveMatchRefresh.disabled = true;
    feedStatus.textContent = "Checking the latest match update…";
    try {
      const matchQuery = new URLSearchParams({
        match: String(matchNumber),
        home: matchHome,
        away: matchAway,
      });
      const response = await fetch(`/api/cpl-live-score?${matchQuery}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Score unavailable");
      const payload = await response.json();
      if (!payload.match || payload.source !== "official-cpl-mcpro") throw new Error("Unverified response");
      renderMatch(payload.match, payload.fetchedAt);
      window.clearTimeout(pollTimer);
      const status = String(payload.match.status || "");
      if (!completePattern.test(status)) {
        pollTimer = window.setTimeout(loadMatch, upcomingPattern.test(status) ? 60000 : 15000);
      }
    } catch {
      feedState.textContent = "Feed unavailable";
      feedStatus.textContent = "Live scores are temporarily unavailable. The confirmed fixture details below remain available.";
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
