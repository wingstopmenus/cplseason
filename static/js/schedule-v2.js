(() => {
  const cards = [...document.querySelectorAll("[data-schedule-match]")];
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
  const viewButtons = document.querySelectorAll("[data-schedule-view]");
  const matchCentre = document.querySelector(".schedule-match-centre");
  const viewSidebar = document.querySelector("#schedule-view-sidebar");
  const resultsTitle = document.querySelector(".schedule-match-centre .section-heading h2");

  if (!cards.length) return;

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
        all: "Complete CPL 2026 schedule",
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
    })
    .catch(() => {
      if (timezoneSelect) timezoneSelect.disabled = true;
      if (timezoneNote) {
        timezoneNote.textContent =
          "Timezone conversion is temporarily unavailable. Fixture cards still show venue local time.";
      }
    });

  applyFilters();
})();
