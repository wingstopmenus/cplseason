(() => {
  const cards = [...document.querySelectorAll("[data-schedule-match]")];
  cards.forEach((card) => {
    card.dataset.matchState = "upcoming";
    const cta = card.querySelector(".schedule-match-centre-cta");
    if (cta) cta.dataset.statusLabel = "UPCOMING";
  });
  const venueFilter = document.querySelector("#schedule-venue-filter");
  const teamFilter = document.querySelector("#schedule-team-filter");
  const monthFilter = document.querySelector("#schedule-month-filter");
  const stageFilter = document.querySelector("#schedule-stage-filter");
  const resetButton = document.querySelector("#schedule-filter-reset");
  const filterCount = document.querySelector("#schedule-filter-count");
  const emptyState = document.querySelector("#schedule-empty-state");
  const playoffHeading = document.querySelector("[data-schedule-stage-heading]");
  const teamButtons = document.querySelectorAll("[data-schedule-team-jump]");
  const timezoneSelect = document.querySelector("#schedule-timezone");
  const timezoneNote = document.querySelector("#schedule-timezone-note");
  const monthLabels = document.querySelectorAll("[data-schedule-month-label]");
  const matchLists = [...document.querySelectorAll(".schedule-match-list")];
  const viewButtons = document.querySelectorAll("[data-schedule-view]");
  const matchCentre = document.querySelector(".schedule-match-centre");
  const viewSidebar = document.querySelector("#schedule-view-sidebar");
  const resultsTitle = document.querySelector(".schedule-match-centre .section-heading h2");
  const faqItems = [...document.querySelectorAll(".schedule-faq-list details")];

  if (!cards.length) return;

  faqItems.forEach((item, index) => {
    item.open = index === 0;
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  const cardMonth = (card) =>
    card.querySelector("time")?.getAttribute("datetime")?.slice(5, 7) || "";

  const isPlayoff = (card) =>
    (card.dataset.stage || "").toLowerCase() !== "league";

  const applyFilters = () => {
    const venue = venueFilter?.value || "";
    const team = teamFilter?.value || "";
    const month = monthFilter?.value || "";
    const stage = stageFilter?.value || "";
    let visible = 0;
    let visiblePlayoff = false;

    cards.forEach((card) => {
      const teams = (card.dataset.teamSlugs || "").trim().split(/\s+/);
      const venueMatches = !venue || card.dataset.venueSlug === venue;
      const teamMatches = !team || teams.includes(team);
      const monthMatches = !month || cardMonth(card) === month;
      const playoff = isPlayoff(card);
      const stageMatches =
        !stage ||
        (stage === "league" && !playoff) ||
        (stage === "playoffs" && playoff);
      const show = venueMatches && teamMatches && monthMatches && stageMatches;

      card.hidden = !show;
      if (show) {
        visible += 1;
        visiblePlayoff ||= playoff;
      }
    });

    if (filterCount) {
      filterCount.textContent = `${visible} ${visible === 1 ? "match" : "matches"}`;
    }
    if (emptyState) emptyState.hidden = visible !== 0;
    if (playoffHeading) playoffHeading.hidden = !visiblePlayoff;
    monthLabels.forEach((label) => {
      const labelMonth = label.dataset.scheduleMonthLabel;
      label.hidden = !cards.some(
        (card) => !card.hidden && cardMonth(card) === labelMonth,
      );
    });
    matchLists.forEach((list) => {
      const hasVisibleCard = [...list.querySelectorAll("[data-schedule-match]")].some(
        (card) => !card.hidden,
      );
      list.hidden = !hasVisibleCard;
    });
  };

  [venueFilter, teamFilter, monthFilter, stageFilter]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("change", applyFilters));

  resetButton?.addEventListener("click", () => {
    [venueFilter, teamFilter, monthFilter, stageFilter]
      .filter(Boolean)
      .forEach((control) => {
        control.value = "";
      });
    applyFilters();
  });

  teamButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!teamFilter) return;
      teamFilter.value = button.dataset.scheduleTeamJump || "";
      if (venueFilter) venueFilter.value = "";
      if (monthFilter) monthFilter.value = "";
      if (stageFilter) stageFilter.value = "league";
      applyFilters();
      document.querySelector("#all-matches")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });

  const sidebarOptions = (type) => {
    const source = type === "team" ? teamFilter : venueFilter;
    if (!source || !viewSidebar) return;
    viewSidebar.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = type === "team" ? "Choose a team" : "Choose a venue";
    viewSidebar.append(heading);
    [...source.options].slice(1).forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.textContent;
      button.dataset.value = option.value;
      button.classList.toggle("active", index === 0);
      button.addEventListener("click", () => {
        const currentScroll = window.scrollY;
        viewSidebar.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        source.value = option.value;
        if (resultsTitle) resultsTitle.textContent = `${option.textContent} fixtures`;
        applyFilters();
        requestAnimationFrame(() => window.scrollTo({ top: currentScroll, behavior: "instant" }));
      });
      viewSidebar.append(button);
    });
    source.value = source.options[1]?.value || "";
  };

  const setView = (view) => {
    [venueFilter, teamFilter, monthFilter, stageFilter].filter(Boolean).forEach((control) => {
      control.value = "";
    });
    matchCentre?.classList.remove("is-split-view");
    if (viewSidebar) {
      viewSidebar.hidden = true;
      viewSidebar.replaceChildren();
    }
    if (view === "august" && monthFilter) monthFilter.value = "08";
    if (view === "september" && monthFilter) monthFilter.value = "09";
    if (view === "playoffs" && stageFilter) stageFilter.value = "playoffs";
    if (view === "team") {
      matchCentre?.classList.add("is-split-view");
      if (viewSidebar) viewSidebar.hidden = false;
      if (stageFilter) stageFilter.value = "league";
      sidebarOptions("team");
    }
    if (view === "venue") {
      matchCentre?.classList.add("is-split-view");
      if (viewSidebar) viewSidebar.hidden = false;
      sidebarOptions("venue");
    }
    if (resultsTitle) {
      const titles = {
        all: "CPL 2026 Schedule & Fixtures",
        august: "August 2026 fixtures",
        september: "September 2026 fixtures",
        playoffs: "CPL 2026 playoffs and final",
        team: `${teamFilter?.options[1]?.textContent || "Team"} fixtures`,
        venue: `${venueFilter?.options[1]?.textContent || "Venue"} fixtures`,
      };
      resultsTitle.textContent = titles[view] || titles.all;
    }
    viewButtons.forEach((button) => button.classList.toggle("active", button.dataset.scheduleView === view));
    applyFilters();
  };

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.scheduleView || "all"));
  });

  const timezoneLabels = new Map([
    ["America/New_York", "US & Canada Eastern"],
    ["Europe/London", "United Kingdom"],
    ["Asia/Kolkata", "India"],
    ["Asia/Karachi", "Pakistan"],
    ["Australia/Sydney", "Sydney"],
  ]);

  let matchSchedule = [];
  const liveSpotlight = document.querySelector("[data-schedule-live-spotlight]");
  const teamSlugs = new Map([
    ["Jamaica Kingsmen", "jamaica-kingsmen"],
    ["Antigua & Barbuda Falcons", "antigua-barbuda-falcons"],
    ["Barbados Tridents", "barbados-royals"],
    ["Guyana Amazon Warriors", "guyana-amazon-warriors"],
    ["Saint Lucia Kings", "saint-lucia-kings"],
    ["St Kitts & Nevis Patriots", "st-kitts-nevis-patriots"],
    ["Trinbago Knight Riders", "trinbago-knight-riders"],
  ]);

  const renderLiveSpotlight = (match, seasonComplete = false) => {
    if (!liveSpotlight || !match) return;
    const text = (selector, value) => {
      const node = liveSpotlight.querySelector(selector);
      if (node) node.textContent = value;
    };
    text("[data-live-kicker]", seasonComplete ? "Season complete · Final" : `Next fixture · Match ${String(match.matchNumber).padStart(2, "0")}`);
    text("[data-live-home]", match.home);
    text("[data-live-away]", match.away);
    text("[data-live-date]", match.label);
    text("[data-live-time]", match.time);
    text("[data-live-venue]", match.venue);
    const dateTime = liveSpotlight.querySelector("[data-live-datetime]");
    if (dateTime) dateTime.dateTime = match.startIso;
    const link = liveSpotlight.querySelector("[data-live-match-link]");
    if (link) link.href = match.url;
    [["home", match.home], ["away", match.away]].forEach(([side, name]) => {
      const slug = teamSlugs.get(name);
      const logo = liveSpotlight.querySelector(`[data-live-${side}-logo]`);
      if (logo && slug) {
        logo.src = `/static/img/official/teams/${slug}.webp`;
        logo.alt = `${name} logo`;
      }
    });
  };

  const refreshLiveSpotlight = async () => {
    if (!liveSpotlight || !matchSchedule.length) return;
    let statuses = [];
    try {
      const response = await fetch("/api/cpl-matches", { cache: "no-store" });
      if (response.ok) statuses = await response.json();
    } catch (_) {}
    const settled = new Set(["complete", "completed", "closed", "finished", "final", "abandoned", "cancelled", "canceled", "no result"]);
    const statusByMatch = new Map(
      (Array.isArray(statuses) ? statuses : []).map((item) => [
        Number(item.matchNumber),
        String(item.status || "").trim().toLowerCase().replace(/[_-]+/g, " "),
      ]),
    );
    cards.forEach((card) => {
      const matchLabel = card.querySelector(".schedule-match-label strong")?.textContent || "";
      const matchNumber = Number(matchLabel.match(/\d+/)?.[0]);
      const fixture = matchSchedule.find((item) => Number(item.matchNumber) === matchNumber);
      let status = statusByMatch.get(matchNumber) || "";
      if (!status && fixture?.startIso) {
        const start = Date.parse(fixture.startIso);
        if (Number.isFinite(start) && Date.now() >= start + 6 * 60 * 60 * 1000) status = "complete";
      }
      const isComplete = settled.has(status);
      const isLive = Boolean(status) && !isComplete && !/upcoming|scheduled|fixture|pre match/.test(status);
      const state = isComplete ? "complete" : isLive ? "live" : "upcoming";
      const cta = card.querySelector(".schedule-match-centre-cta");
      card.dataset.matchState = state;
      if (!cta) return;
      cta.dataset.statusLabel = isComplete ? "COMPLETED" : isLive ? "LIVE" : "UPCOMING";
      const actionText = [...cta.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
      if (actionText) actionText.nodeValue = isComplete ? "View match result " : isLive ? "Follow match live " : "Open match centre ";
    });
    const next = matchSchedule.find((match) => {
      const status = statusByMatch.get(Number(match.matchNumber));
      if (settled.has(status)) return false;
      if (status) return true;
      const start = Date.parse(match.startIso);
      return !Number.isFinite(start) || Date.now() < start + 6 * 60 * 60 * 1000;
    });
    renderLiveSpotlight(next || matchSchedule[matchSchedule.length - 1], !next);
  };

  const renderConvertedTimes = () => {
    const timezone = timezoneSelect?.value || "";
    document
      .querySelectorAll(".schedule-converted-time")
      .forEach((item) => item.remove());

    if (!timezone) {
      if (timezoneNote) {
        timezoneNote.textContent =
          "All published fixture times are local to the host venue.";
      }
      return;
    }

    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const label = timezoneLabels.get(timezone) || timezone;

    cards.forEach((card) => {
      const match = matchSchedule.find(
        (item) => item.url === card.dataset.matchUrl,
      );
      const localTime = card.querySelector(".schedule-match-details p strong");
      if (!match?.startIso || !localTime) return;
      const converted = document.createElement("span");
      converted.className = "schedule-converted-time";
      converted.textContent = `${formatter.format(new Date(match.startIso))} · ${label}`;
      localTime.insertAdjacentElement("afterend", converted);
    });

    if (timezoneNote) {
      timezoneNote.textContent = `Converted times are now shown for ${label}. Venue local times remain unchanged.`;
    }
  };

  timezoneSelect?.addEventListener("change", renderConvertedTimes);

  fetch("/static/match-spotlight.json")
    .then((response) => {
      if (!response.ok) throw new Error("Schedule data unavailable");
      return response.json();
    })
    .then((schedule) => {
      matchSchedule = Array.isArray(schedule) ? schedule : [];
      renderConvertedTimes();
      refreshLiveSpotlight();
    })
    .catch(() => {
      if (timezoneSelect) timezoneSelect.disabled = true;
      if (timezoneNote) {
        timezoneNote.textContent =
          "Timezone conversion is temporarily unavailable. Fixture cards still show venue local time.";
      }
    });

  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshLiveSpotlight();
  }, 30000);

  applyFilters();
})();
