(() => {
  "use strict";

  const root = document.querySelector("[data-live-score]");
  if (!root) return;

  const endpoint = root.dataset.liveScoreEndpoint;
  const intervalSeconds = Math.max(
    10,
    Number(root.dataset.liveScoreInterval) || 15,
  );
  const refreshButton = root.querySelector("[data-live-refresh]");
  const feedSignal = root.querySelector("[data-feed-signal]");
  const feedClock = root.querySelector("[data-feed-clock]");
  const feedMessage = root.querySelector("[data-feed-message]");
  const heroContext = root.querySelector("[data-hero-context]");
  const heroMatchLabel = root.querySelector("[data-hero-match-label]");
  const heroMatchDate = root.querySelector("[data-hero-match-date]");
  const heroMatchVenue = root.querySelector("[data-hero-match-venue]");
  const heroMatchLink = root.querySelector("[data-hero-match-link]");
  const heroCountdownValue = root.querySelector("[data-hero-countdown-value]");
  const heroCountdownLabel = root.querySelector("[data-hero-countdown-label]");
  const matchStatus = root.querySelector("[data-match-status]");
  const matchLabel = root.querySelector("[data-match-label]");
  const matchDate = root.querySelector("[data-match-date]");
  const matchVenue = root.querySelector("[data-match-venue]");
  const currentMatchLink = root.querySelector("[data-current-match-link]");
  const centreStatus = root.querySelector("[data-centre-status]");
  const countdownValue = root.querySelector("[data-countdown-value]");
  const countdownLabel = root.querySelector("[data-countdown-label]");
  const stateHeading = root.querySelector("[data-state-heading]");
  const stateCopy = root.querySelector("[data-state-copy]");
  const liveToss = root.querySelector("[data-live-toss]");
  const liveCrr = root.querySelector("[data-live-crr]");
  const liveTarget = root.querySelector("[data-live-target]");
  const liveRrr = root.querySelector("[data-live-rrr]");
  const liveBatters = root.querySelector("[data-live-batters]");
  const liveBowler = root.querySelector("[data-live-bowler]");
  const recentBalls = root.querySelector("[data-recent-balls]");
  const upcomingContainer = root.querySelector("[data-upcoming-matches]");
  const resultsContainer = root.querySelector("[data-live-results]");
  const resultsStatus = root.querySelector("[data-results-status]");
  const lineupsStatus = root.querySelector("[data-lineups-status]");
  const lineupPanels = {
    home: root.querySelector('[data-live-lineup="home"]'),
    away: root.querySelector('[data-live-lineup="away"]'),
  };
  const mapElement = document.querySelector("#live-score-match-map");
  const teamPanels = {
    home: root.querySelector('[data-score-team="home"]'),
    away: root.querySelector('[data-score-team="away"]'),
  };
  const heroTeamPanels = {
    home: root.querySelector('[data-hero-team="home"]'),
    away: root.querySelector('[data-hero-team="away"]'),
  };

  let matchDirectory = new Map();
  try {
    const parsed = JSON.parse(mapElement?.textContent || "[]");
    matchDirectory = new Map(
      parsed.map((match) => [Number(match.matchNumber), match]),
    );
  } catch (error) {
    console.warn("CPL match directory could not be read", error);
  }

  let requestInProgress = false;
  let currentFocusStart = Date.parse(
    root.querySelector("[data-live-countdown]")?.dataset.start || "",
  );
  let currentStatus = "Upcoming";

  const text = (element, value) => {
    if (element && value !== null && value !== undefined && value !== "") {
      element.textContent = String(value);
    }
  };

  const numberText = (value, digits = 1) => {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toFixed(digits).replace(/\.0$/, "");
  };

  const isComplete = (status) =>
    /complete|completed|result|abandon|cancel|no result/i.test(status || "");
  const isUpcoming = (status) =>
    /upcoming|scheduled|fixture|pre-match/i.test(status || "");
  const isLive = (status) =>
    Boolean(status) && !isComplete(status) && !isUpcoming(status);

  const setFeedSignal = (label, state) => {
    if (!feedSignal) return;
    const dot = feedSignal.querySelector("i");
    feedSignal.replaceChildren();
    if (dot) feedSignal.append(dot);
    feedSignal.append(document.createTextNode(label));
    feedSignal.classList.toggle("is-connected", state === "connected");
    feedSignal.classList.toggle("is-error", state === "error");
  };

  const localMatch = (number) => matchDirectory.get(Number(number));

  const matchUrl = (number) =>
    localMatch(number)?.url || "/schedule/";

  const scoreForTeam = (match, teamId) => {
    const innings = (match.innings || []).filter(
      (item) => item.battingTeamId === teamId,
    );
    return innings.length ? innings[innings.length - 1] : null;
  };

  const updateTeam = (panel, team, localTeam, innings) => {
    if (!panel) return;
    const link = panel.querySelector("[data-team-link]");
    const logo = panel.querySelector("[data-team-logo]");
    const shortName = panel.querySelector("[data-team-short]");
    const name = panel.querySelector("[data-team-name]");
    const score = panel.querySelector("[data-team-score]");
    const overs = panel.querySelector("[data-team-overs]");
    const displayName = localTeam?.name || team?.name || "To be confirmed";
    const displayShort = localTeam?.shortName || team?.shortName || "TBC";
    const displayLogo = localTeam?.logo || team?.logo;

    text(shortName, displayShort);
    text(name, displayName);
    if (link) {
      const teamMatch = [...matchDirectory.values()].find(
        (item) =>
          item.home?.name === displayName || item.away?.name === displayName,
      );
      const teamUrl =
        teamMatch?.home?.name === displayName
          ? teamMatch.home.url
          : teamMatch?.away?.url;
      if (teamUrl) link.href = teamUrl;
    }
    if (logo && displayLogo) {
      logo.src = displayLogo;
      logo.alt = `${displayName} logo`;
    }

    if (innings && Number.isFinite(innings.runs)) {
      const wickets = Number.isFinite(innings.wickets)
        ? `/${innings.wickets}`
        : "";
      text(score, `${innings.runs}${wickets}`);
      const oversValue = Number.isFinite(innings.overs)
        ? `${numberText(innings.overs)} overs`
        : innings.status || "Innings";
      text(overs, oversValue);
    } else {
      text(score, "—");
      text(overs, isLive(currentStatus) ? "Awaiting innings score" : "Score pending");
    }
  };

  const updateHeroTeam = (panel, team, localTeam) => {
    if (!panel) return;
    const displayName = localTeam?.name || team?.name || "To be confirmed";
    const displayShort = localTeam?.shortName || team?.shortName || "TBC";
    const displayLogo = localTeam?.logo || team?.logo;
    const logo = panel.querySelector("img");
    const shortName = panel.querySelector("strong");
    text(shortName, displayShort);
    if (localTeam?.url) panel.href = localTeam.url;
    if (logo && displayLogo) {
      logo.src = displayLogo;
      logo.alt = `${displayName} logo`;
    }
  };

  const renderPlayers = (container, players, mode) => {
    if (!container) return;
    container.replaceChildren();
    if (!players?.length) {
      const empty = document.createElement("p");
      empty.className = "live-score-empty";
      empty.textContent =
        mode === "bowler"
          ? "The current bowler will appear when play begins."
          : "The batters at the crease will appear when play begins.";
      container.append(empty);
      return;
    }
    players.forEach((player) => {
      const row = document.createElement("div");
      row.className = "live-player-row";
      const name = document.createElement("strong");
      name.textContent = player.name || "Player";
      const primary = document.createElement("span");
      const secondary = document.createElement("small");
      if (mode === "bowler") {
        primary.textContent =
          Number.isFinite(player.wickets) && Number.isFinite(player.runsConceded)
            ? `${player.wickets}/${player.runsConceded}`
            : "Bowling";
        secondary.textContent = Number.isFinite(player.overs)
          ? `${numberText(player.overs)} ov`
          : "Live";
      } else {
        primary.textContent = Number.isFinite(player.runs)
          ? String(player.runs)
          : "0";
        secondary.textContent = Number.isFinite(player.balls)
          ? `${player.balls} balls`
          : "At crease";
      }
      row.append(name, primary, secondary);
      container.append(row);
    });
  };

  const renderRecentBalls = (balls) => {
    if (!recentBalls) return;
    recentBalls.replaceChildren();
    if (!balls?.length) {
      const empty = document.createElement("p");
      empty.className = "live-score-empty";
      empty.textContent = "Recent deliveries will appear when play begins.";
      recentBalls.append(empty);
      return;
    }
    const list = document.createElement("div");
    list.className = "live-ball-list";
    balls.forEach((ball) => {
      const outcome = document.createElement("span");
      outcome.textContent = ball.label || "•";
      const ballLabel =
        Number.isFinite(ball.over) && Number.isFinite(ball.ball)
          ? `Ball ${ball.over}.${ball.ball}`
          : "Recent ball";
      outcome.title = ballLabel;
      outcome.setAttribute("aria-label", `${ballLabel}: ${outcome.textContent}`);
      list.append(outcome);
    });
    recentBalls.append(list);
  };

  const renderLineup = (panel, team, enabled) => {
    if (!panel) return;
    const heading = panel.querySelector("h3");
    text(heading, team?.name || "Team");
    [...panel.children].forEach((child) => {
      if (child !== heading) child.remove();
    });
    const players = enabled
      ? (team?.players || []).filter((player) => !player.substitute)
      : [];
    if (!players.length) {
      const empty = document.createElement("p");
      empty.className = "live-score-empty";
      empty.textContent =
        "The confirmed XI will appear here after the toss.";
      panel.append(empty);
      return;
    }
    const list = document.createElement("ol");
    list.className = "live-lineup-list";
    players.slice(0, 11).forEach((player) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = player.name || "Player";
      item.append(name);
      if (player.captain || player.wicketKeeper) {
        const role = document.createElement("b");
        role.textContent = `${player.captain ? "C" : ""}${
          player.captain && player.wicketKeeper ? " · " : ""
        }${player.wicketKeeper ? "WK" : ""}`;
        item.append(role);
      }
      list.append(item);
    });
    panel.append(list);
  };

  const updateStatus = (status) => {
    currentStatus = status || "Upcoming";
    text(matchStatus, currentStatus);
    matchStatus?.classList.toggle("is-live", isLive(currentStatus));
    matchStatus?.classList.toggle("is-complete", isComplete(currentStatus));
    text(
      centreStatus,
      isLive(currentStatus) ? "LIVE" : isComplete(currentStatus) ? "FT" : "VS",
    );
  };

  const renderFocus = (match, fetchedAt) => {
    if (!match) return;
    const local = localMatch(match.matchNumber);
    const officialTeams = match.teams || [];
    const home = officialTeams.find((team) => team.isHome) || officialTeams[0];
    const away = officialTeams.find((team) => !team.isHome) || officialTeams[1];
    currentFocusStart = Date.parse(match.startDate || local?.startIso || "");
    updateStatus(match.status);
    text(
      heroContext,
      isLive(match.status)
        ? "CPL match in progress"
        : isComplete(match.status)
          ? "Latest CPL result"
          : "Next CPL match",
    );

    text(
      matchLabel,
      `Match ${match.matchNumber || local?.matchNumber || "—"} · ${
        local?.stage || match.stage || "CPL 2026"
      }`,
    );
    text(
      heroMatchLabel,
      `Match ${match.matchNumber || local?.matchNumber || "—"} · ${
        local?.stage || match.stage || "CPL 2026"
      }`,
    );
    if (matchDate && local) {
      matchDate.dateTime = local.startIso;
      text(matchDate, `${local.dateLabelLong} · ${local.timeLabel} local`);
    }
    if (heroMatchDate && local) {
      heroMatchDate.dateTime = local.startIso;
      text(heroMatchDate, `${local.dateLabelLong} · ${local.timeLabel} local`);
    }
    text(matchVenue, local?.venue || match.venue?.name);
    text(heroMatchVenue, local?.venue || match.venue?.name);
    if (currentMatchLink) currentMatchLink.href = matchUrl(match.matchNumber);
    if (heroMatchLink) heroMatchLink.href = matchUrl(match.matchNumber);

    updateTeam(
      teamPanels.home,
      home,
      local?.home,
      scoreForTeam(match, home?.id),
    );
    updateTeam(
      teamPanels.away,
      away,
      local?.away,
      scoreForTeam(match, away?.id),
    );
    updateHeroTeam(heroTeamPanels.home, home, local?.home);
    updateHeroTeam(heroTeamPanels.away, away, local?.away);
    const lineupsEnabled = !isUpcoming(match.status);
    renderLineup(lineupPanels.home, home, lineupsEnabled);
    renderLineup(lineupPanels.away, away, lineupsEnabled);
    text(
      lineupsStatus,
      lineupsEnabled &&
        (home?.players?.length || away?.players?.length)
        ? "Official playing XIs"
        : "Team sheets not yet published",
    );

    const state = isUpcoming(match.status)
      ? "Live score starts on match day"
      : isComplete(match.status)
        ? match.stateOfPlay || match.description || "The official match state has been closed."
        : match.stateOfPlay ||
          match.description ||
          "The live innings is updating from the CPL match feed.";
    text(stateHeading, state);
    text(
      stateCopy,
      isLive(match.status)
        ? "The score, overs and match status refresh automatically while this page is open."
        : isComplete(match.status)
          ? "View the full scorecard for complete innings details."
          : "The toss, playing XIs and innings scores will appear as soon as the CPL match feed publishes them.",
    );
    text(liveToss, match.toss || "Awaiting confirmation");
    text(liveCrr, numberText(match.live?.currentRunRate));
    text(liveTarget, Number.isFinite(match.live?.target) ? match.live.target : "—");
    text(liveRrr, numberText(match.live?.requiredRunRate));
    renderPlayers(liveBatters, match.live?.batters || [], "batters");
    renderPlayers(
      liveBowler,
      match.live?.bowler ? [match.live.bowler] : [],
      "bowler",
    );
    renderRecentBalls(match.live?.recentBalls || []);

    const checked = new Date(fetchedAt);
    text(
      feedMessage,
      Number.isNaN(checked.getTime())
        ? "CPL match feed connected"
        : `Last checked ${checked.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "UTC",
          })} UTC`,
    );
  };

  const renderUpcoming = (schedule, focusNumber) => {
    if (!upcomingContainer) return;
    const cards = [...upcomingContainer.querySelectorAll("[data-upcoming-card]")];
    const upcoming = (schedule || [])
      .filter(
        (match) =>
          !isComplete(match.status) &&
          Number(match.matchNumber) !== Number(focusNumber),
      )
      .slice(0, cards.length);

    cards.forEach((card, index) => {
      const match = upcoming[index];
      if (!match) {
        card.hidden = true;
        return;
      }
      const local = localMatch(match.matchNumber);
      card.hidden = false;
      card.dataset.matchNumber = String(match.matchNumber);
      const top = card.querySelector("div");
      const matchTag = top?.querySelector("span");
      const date = top?.querySelector("time");
      const shorts = card.querySelectorAll("article > p strong, p strong");
      const title = card.querySelector("h3");
      const detail = card.querySelector("small");
      const link = card.querySelector("a");
      text(matchTag, `Match ${match.matchNumber}`);
      if (date && local) {
        date.dateTime = local.startIso;
        text(date, local.dateLabel);
      }
      text(shorts[0], local?.home?.shortName || match.teams?.[0]?.shortName);
      text(shorts[1], local?.away?.shortName || match.teams?.[1]?.shortName);
      if (title && local) {
        title.replaceChildren(
          document.createTextNode(local.home.name),
          Object.assign(document.createElement("span"), { textContent: " vs " }),
          document.createTextNode(local.away.name),
        );
      }
      text(detail, local ? `${local.timeLabel} local · ${local.venue}` : match.venue?.name);
      if (link) link.href = matchUrl(match.matchNumber);
    });
  };

  const resultScore = (match, team) => {
    const innings = scoreForTeam(match, team?.id);
    if (!innings || !Number.isFinite(innings.runs)) return "—";
    return `${innings.runs}${
      Number.isFinite(innings.wickets) ? `/${innings.wickets}` : ""
    }`;
  };

  const renderResults = (matches) => {
    if (!resultsContainer) return;
    if (!matches?.length) {
      text(resultsStatus, "Results appear after each match");
      return;
    }
    resultsContainer.replaceChildren();
    text(resultsStatus, `${matches.length} latest completed matches`);
    matches.forEach((match) => {
      const card = document.createElement("article");
      card.className = "live-result-card";
      const label = document.createElement("span");
      label.textContent = `Match ${match.matchNumber} · ${match.status}`;
      const heading = document.createElement("h3");
      heading.textContent = match.stateOfPlay || match.description || "Official result";
      card.append(label, heading);
      (match.teams || []).slice(0, 2).forEach((team) => {
        const row = document.createElement("div");
        row.className = "live-result-team";
        const name = document.createElement("strong");
        name.textContent = team.shortName || team.name;
        const score = document.createElement("b");
        score.textContent = resultScore(match, team);
        row.append(name, score);
        card.append(row);
      });
      const link = document.createElement("a");
      link.href = matchUrl(match.matchNumber);
      link.textContent = "Open scorecard →";
      card.append(link);
      resultsContainer.append(card);
    });
  };

  const refreshScore = async () => {
    if (!endpoint || requestInProgress) return;
    requestInProgress = true;
    refreshButton?.classList.add("is-loading");
    if (refreshButton) refreshButton.disabled = true;
    setFeedSignal("Checking feed", "checking");
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(`Live score request failed: ${response.status}`);
      const payload = await response.json();
      if (
        payload?.source !== "official-cpl-mcpro" ||
        !payload.focus ||
        !Array.isArray(payload.schedule)
      ) {
        throw new Error("Live score response is incomplete");
      }
      renderFocus(payload.focus, payload.fetchedAt);
      renderUpcoming(payload.schedule, payload.focus.matchNumber);
      renderResults(payload.recent || []);
      setFeedSignal("CPL score feed connected", "connected");
    } catch (error) {
      console.warn("CPL live score refresh unavailable", error);
      setFeedSignal("Score feed temporarily unavailable", "error");
      text(
        feedMessage,
        "The score feed is unavailable. The last confirmed match update remains on screen.",
      );
    } finally {
      requestInProgress = false;
      refreshButton?.classList.remove("is-loading");
      if (refreshButton) refreshButton.disabled = false;
    }
  };

  const updateClock = () => {
    if (feedClock) {
      feedClock.textContent = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(new Date());
    }

    if (!countdownValue || !Number.isFinite(currentFocusStart)) return;
    const remaining = currentFocusStart - Date.now();
    if (remaining <= 0) {
      text(countdownValue, isComplete(currentStatus) ? "Complete" : "Match window");
      text(countdownLabel, isComplete(currentStatus) ? "Official result" : "Live feed active");
      text(heroCountdownValue, isComplete(currentStatus) ? "Complete" : "Live now");
      text(heroCountdownLabel, isComplete(currentStatus) ? "Official result" : "Match in progress");
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const countdownText = `${days ? `${days}d ` : ""}${String(hours).padStart(
      2,
      "0",
    )}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    text(countdownValue, countdownText);
    text(heroCountdownValue, countdownText);
    text(countdownLabel, "Until first ball");
    text(heroCountdownLabel, "Until first ball");
  };

  refreshButton?.addEventListener("click", refreshScore);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshScore();
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshScore();
  }, intervalSeconds * 1000);
  window.setInterval(updateClock, 1000);
  updateClock();
  refreshScore();
})();
