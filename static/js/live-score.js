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
  const scorecardTab = root.querySelector("[data-scorecard-tab]");
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
  const commentaryStatus = root.querySelector("[data-commentary-status]");
  const commentaryHeading = root.querySelector("[data-commentary-heading]");
  const commentaryCopy = root.querySelector("[data-commentary-copy]");
  const commentaryMatchLink = root.querySelector("[data-commentary-match-link]");
  const commentaryFeed = root.querySelector("[data-commentary-feed]");
  const infoMatch = root.querySelector("[data-info-match]");
  const infoDate = root.querySelector("[data-info-date]");
  const infoStart = root.querySelector("[data-info-start]");
  const infoVenue = root.querySelector("[data-info-venue]");
  const infoStage = root.querySelector("[data-info-stage]");
  const upcomingContainer = root.querySelector("[data-upcoming-matches]");
  const otherMatchesContainer = root.querySelector("[data-other-matches]");
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
  let currentPhase = "Upcoming";
  let lastSuccessfulRefresh = 0;
  let commentaryMatchNumber = null;
  let commentaryVisibleCount = 20;
  const commentaryHistory = new Map();

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

  const commentaryKey = (ball, index) => {
    const delivery =
      Number.isFinite(ball?.over) && Number.isFinite(ball?.ball)
        ? `${ball.over}.${ball.ball}`
        : `recent-${index}`;
    return `${ball?.inningsNumber || 0}:${delivery}:${ball?.label || ""}:${ball?.commentary || ""}`;
  };

  const commentaryEmpty = (eyebrow, heading, copy) => {
    if (!commentaryFeed) return;
    const state = document.createElement("div");
    state.className = "live-score-commentary-empty";
    const label = document.createElement("span");
    label.textContent = eyebrow;
    const title = document.createElement("strong");
    title.textContent = heading;
    const body = document.createElement("p");
    body.textContent = copy;
    state.append(label, title, body);
    commentaryFeed.replaceChildren(state);
  };

  const renderCommentary = (match, local) => {
    if (!commentaryFeed || !match) return;
    const matchNumber = Number(match.matchNumber || local?.matchNumber);
    if (commentaryMatchNumber !== matchNumber) {
      commentaryHistory.clear();
      commentaryMatchNumber = matchNumber;
      commentaryVisibleCount = 20;
    }

    const teams = match.teams || [];
    const home = teams.find((team) => team.isHome) || teams[0];
    const away = teams.find((team) => !team.isHome) || teams[1];
    const homeName = local?.home?.name || home?.name || "Home team";
    const awayName = local?.away?.name || away?.name || "Away team";
    text(commentaryHeading, `${homeName} vs ${awayName}`);
    if (commentaryMatchLink) commentaryMatchLink.href = matchUrl(matchNumber);

    const live = isLive(match.status);
    const complete = isComplete(match.status);
    commentaryStatus?.classList.toggle("is-live", live);
    commentaryStatus?.classList.toggle("is-complete", complete);
    if (commentaryStatus) {
      const dot = document.createElement("i");
      dot.setAttribute("aria-hidden", "true");
      const statusLabel = live ? currentPhase : complete ? "Match complete" : "Upcoming";
      commentaryStatus.replaceChildren(dot, document.createTextNode(statusLabel));
    }
    text(
      commentaryCopy,
      live
        ? match.stateOfPlay ||
          match.description ||
          "Follow the latest action as the innings unfolds."
        : complete
          ? match.stateOfPlay ||
            match.description ||
            "The match has finished. Review the final score and key moments below."
          : `${local?.dateLabelLong || "Match day"} · ${local?.timeLabel || "Local time"} at ${local?.venue || match.venue?.name || "the host venue"}.`,
    );

    (match.live?.recentBalls || []).forEach((ball, index) => {
      commentaryHistory.set(commentaryKey(ball, index), ball);
    });
    while (commentaryHistory.size > 30) {
      commentaryHistory.delete(commentaryHistory.keys().next().value);
    }

    const fullCommentary = Array.isArray(match.commentary)
      ? match.commentary
      : [];
    const balls = fullCommentary.length
      ? fullCommentary
      : [...commentaryHistory.values()].reverse();
    if (!balls.length) {
      if (live) {
        commentaryEmpty(
          "Live commentary",
          "Waiting for the next delivery",
          "The latest ball will appear here as soon as play resumes.",
        );
      } else if (complete) {
        commentaryEmpty(
          "Match complete",
          match.stateOfPlay || match.description || "Final result confirmed",
          "Open the match centre for the complete scorecard and innings details.",
        );
      } else {
        commentaryEmpty(
          "Commentary desk",
          "Coverage begins at the first ball",
          "Runs, wickets, boundaries and key moments will appear here throughout the match.",
        );
      }
      return;
    }

    const fragment = document.createDocumentFragment();
    const visibleBalls = balls.slice(0, commentaryVisibleCount);
    const appendOverSummary = (overBalls) => {
      const chronological = [...overBalls].reverse();
      const latest = overBalls.find((ball) => Number.isFinite(ball?.score?.runs)) || overBalls[0];
      const summary = document.createElement("section");
      summary.className = "live-score-over-summary";
      const heading = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `Over ${Number(overBalls[0].over) + 1}`;
      const score = document.createElement("b");
      score.textContent = Number.isFinite(latest?.score?.runs) ? `${latest.score.runs}-${latest.score.wickets ?? 0}` : "Over complete";
      const outcomes = document.createElement("span");
      outcomes.textContent = chronological.map((ball) => ball.label || "•").join(" ");
      heading.append(title, score, outcomes);
      const details = document.createElement("p");
      const batters = [...new Set(overBalls.map((ball) => ball.batterName).filter(Boolean))].slice(0, 2);
      const bowler = overBalls.find((ball) => ball.bowlerName)?.bowlerName;
      details.textContent = [batters.join(" · "), bowler].filter(Boolean).join("  |  ");
      summary.append(heading, details);
      fragment.append(summary);
    };
    visibleBalls.forEach((ball, index) => {
      const previous = visibleBalls[index - 1];
      const next = visibleBalls[index + 1];
      const startsOver = ball.over !== null && ball.over !== undefined && Number(ball.over) !== Number(previous?.over);
      const endsOver = ball.over !== null && ball.over !== undefined && Number(ball.over) !== Number(next?.over);
      const overBalls = visibleBalls.filter((item) => Number(item.over) === Number(ball.over));
      const overComplete = overBalls.some((item) => Number(item.ball) === 6) || index > overBalls.length - 1;
      if (startsOver) {
        const bowler = overBalls.find((item) => item.bowlerName)?.bowlerName;
        if (bowler) {
          const note = document.createElement("p");
          note.className = "live-score-commentary-note";
          note.textContent = `${bowler} comes into the attack`;
          fragment.append(note);
        }
      }
      const item = document.createElement("article");
      item.className = "live-score-commentary-item";
      if (index === 0) item.classList.add("is-latest");
      const delivery = document.createElement("div");
      delivery.className = "live-score-commentary-delivery";
      const over = document.createElement("span");
      over.textContent =
        Number.isFinite(ball.over) && Number.isFinite(ball.ball)
          ? `${ball.over}.${ball.ball}`
          : "Ball";
      const outcome = document.createElement("b");
      outcome.textContent = ball.label || "•";
      delivery.append(over, outcome);
      const detail = document.createElement("div");
      const label = document.createElement("small");
      const inningsLabel = Number.isFinite(ball.inningsNumber)
        ? `Innings ${ball.inningsNumber} · `
        : "";
      label.textContent = `${inningsLabel}${index === 0 ? "Latest delivery" : "Ball-by-ball update"}`;
      const copy = document.createElement("p");
      copy.textContent = ball.commentary || ball.label || "Delivery completed.";
      detail.append(label, copy);
      item.append(delivery, detail);
      fragment.append(item);
      if (endsOver && overComplete) appendOverSummary(overBalls);
    });
    commentaryFeed.replaceChildren(fragment);
    if (balls.length > commentaryVisibleCount) {
      const controls = document.createElement("div");
      controls.className = "live-score-commentary-more";
      const status = document.createElement("span");
      status.textContent = `Showing ${commentaryVisibleCount} of ${balls.length} deliveries`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Load more commentary";
      button.addEventListener("click", () => {
        commentaryVisibleCount = Math.min(commentaryVisibleCount + 20, balls.length);
        renderCommentary(match, local);
      });
      controls.append(status, button);
      commentaryFeed.append(controls);
    }
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
    const futureMatch = Number.isFinite(currentFocusStart) && currentFocusStart > Date.now() + 5 * 60 * 1000;
    const effectiveStatus = futureMatch ? "Scheduled" : (match.status || "Upcoming");
    currentPhase = isUpcoming(effectiveStatus) ? effectiveStatus : (match.stateOfPlay || match.description || effectiveStatus);
    updateStatus(currentPhase);
    text(
      heroContext,
      isLive(effectiveStatus)
        ? "CPL match in progress"
        : isComplete(effectiveStatus)
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
    text(infoMatch, `${home?.name || local?.home?.name || "TBC"} vs ${away?.name || local?.away?.name || "TBC"}`);
    text(infoDate, local?.dateLabelLong || "Fixture date");
    text(infoStart, `${local?.timeLabel || "TBC"} local`);
    text(infoVenue, local?.venue || match.venue?.name || "Venue to be confirmed");
    text(infoStage, local?.stage || match.stage || "CPL 2026");
    if (currentMatchLink) currentMatchLink.href = matchUrl(match.matchNumber);
    if (scorecardTab) scorecardTab.href = matchUrl(match.matchNumber);
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
    const lineupsEnabled = !isUpcoming(effectiveStatus);
    renderLineup(lineupPanels.home, home, lineupsEnabled);
    renderLineup(lineupPanels.away, away, lineupsEnabled);
    text(
      lineupsStatus,
      lineupsEnabled &&
        (home?.players?.length || away?.players?.length)
        ? "Official playing XIs"
        : "Team sheets not yet published",
    );

    const state = isUpcoming(effectiveStatus)
      ? "Live score starts on match day"
      : isComplete(effectiveStatus)
        ? match.stateOfPlay || match.description || "The match is complete."
        : match.chaseEquation || match.stateOfPlay ||
          match.description ||
          "Follow the live innings here.";
    text(stateHeading, state);
    text(
      stateCopy,
      isLive(effectiveStatus)
        ? "The current score, overs and match status are shown here."
        : isComplete(effectiveStatus)
          ? "View the full scorecard for complete innings details."
          : "The toss, playing XIs and innings scores will appear as soon as they are confirmed.",
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
    renderCommentary(match, local);

    const checked = new Date(fetchedAt);
    text(
      feedMessage,
      Number.isNaN(checked.getTime())
        ? "Live scores"
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

    if (otherMatchesContainer) {
      otherMatchesContainer.replaceChildren();
      upcoming.slice(0, 3).forEach((match) => {
        const local = localMatch(match.matchNumber);
        const link = document.createElement("a");
        link.href = matchUrl(match.matchNumber);
        const date = document.createElement("span");
        date.textContent = local?.dateLabel || resultDate(match);
        const teams = document.createElement("strong");
        const home =
          local?.home?.shortName ||
          match.teams?.[0]?.shortName ||
          match.teams?.[0]?.name ||
          "TBC";
        const away =
          local?.away?.shortName ||
          match.teams?.[1]?.shortName ||
          match.teams?.[1]?.name ||
          "TBC";
        teams.append(document.createTextNode(`${home} `));
        const versus = document.createElement("i");
        versus.textContent = "vs";
        teams.append(versus, document.createTextNode(` ${away}`));
        const venue = document.createElement("small");
        venue.textContent = local?.venue || match.venue?.name || "Venue TBC";
        link.append(date, teams, venue);
        otherMatchesContainer.append(link);
      });
    }

    cards.forEach((card, index) => {
      const match = upcoming[index];
      if (!match) {
        card.hidden = true;
        return;
      }
      const local = localMatch(match.matchNumber);
      card.hidden = false;
      card.dataset.matchNumber = String(match.matchNumber);
      const matchTag = card.querySelector("[data-fixture-number]");
      const date = card.querySelector("[data-fixture-date]");
      const teamLinks = card.querySelectorAll("[data-fixture-team]");
      const shorts = card.querySelectorAll("[data-fixture-short]");
      const names = card.querySelectorAll("[data-fixture-name]");
      const logos = card.querySelectorAll("[data-fixture-team] img");
      const localTime = card.querySelector("[data-fixture-time]");
      const venue = card.querySelector("[data-fixture-venue]");
      const link = card.querySelector("[data-fixture-link]");
      if (matchTag) {
        matchTag.replaceChildren(
          Object.assign(document.createElement("b"), {
            textContent: String(match.matchNumber).padStart(2, "0"),
          }),
          document.createTextNode(` Match ${match.matchNumber}`),
        );
      }
      if (date && local) {
        date.dateTime = local.startIso;
        text(date, local.dateLabel);
      }
      text(shorts[0], local?.home?.shortName || match.teams?.[0]?.shortName);
      text(shorts[1], local?.away?.shortName || match.teams?.[1]?.shortName);
      text(names[0], local?.home?.name || match.teams?.[0]?.name);
      text(names[1], local?.away?.name || match.teams?.[1]?.name);
      if (local) {
        if (teamLinks[0]) teamLinks[0].href = local.home.url;
        if (teamLinks[1]) teamLinks[1].href = local.away.url;
        if (logos[0] && local.home.logo) {
          logos[0].src = local.home.logo;
          logos[0].alt = `${local.home.name} logo`;
        }
        if (logos[1] && local.away.logo) {
          logos[1].src = local.away.logo;
          logos[1].alt = `${local.away.name} logo`;
        }
        if (localTime) {
          localTime.dateTime = local.startIso;
          text(localTime, local.timeLabel);
        }
      }
      text(venue, local?.venue || match.venue?.name);
      if (link) link.href = matchUrl(match.matchNumber);
    });
  };

  const resultScore = (match, team) => {
    const innings = scoreForTeam(match, team?.id);
    if (!innings || !Number.isFinite(innings.runs)) return "—";
    return `${innings.runs}${
      Number.isFinite(innings.wickets) ? `/${innings.wickets}` : ""
    }${Number.isFinite(innings.overs) ? ` (${numberText(innings.overs)} ov)` : ""}`;
  };

  const resultDate = (match) => {
    const value = Date.parse(match?.startDate || "");
    if (!Number.isFinite(value)) return "Date unavailable";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Karachi",
    }).format(value);
  };

  const createResultTeam = (match, team) => {
    const local = localMatch(match.matchNumber);
    const localTeam = [local?.home, local?.away].find(
      (item) => item?.name === team?.name || item?.shortName === team?.shortName,
    );
    const row = document.createElement("div");
    row.className = "live-result-team live-result-team-complete";
    const identity = document.createElement("span");
    const logo = document.createElement("img");
    logo.src = localTeam?.logo || team?.logo || "/static/img/brand/cplseason-favicon.webp";
    logo.alt = `${team?.name || "CPL team"} logo`;
    logo.loading = "lazy";
    const name = document.createElement("strong");
    name.textContent = team?.name || team?.shortName || "Team";
    identity.append(logo, name);
    const score = document.createElement("b");
    score.textContent = resultScore(match, team);
    row.append(identity, score);
    return row;
  };

  const renderFeaturedResult = (match) => {
    const completedResult = [match.description, match.stateOfPlay]
      .map((value) => String(value || "").trim())
      .find((value) => value && !/^(complete|completed|match complete|match completed|result)$/i.test(value))
      || (match.winnerName ? `${match.winnerName} won` : "Match completed");
    const card = document.createElement("article");
    card.className = "live-result-card live-result-card-featured";
    const header = document.createElement("header");
    const eyebrow = document.createElement("span");
    eyebrow.textContent = `Match ${match.matchNumber} · Completed`;
    const meta = document.createElement("small");
    meta.textContent = [resultDate(match), match.venue?.name].filter(Boolean).join(" · ");
    header.append(eyebrow, meta);
    const heading = document.createElement("h3");
    heading.textContent = completedResult;
    card.append(header, heading);
    (match.teams || []).slice(0, 2).forEach((team) => {
      card.append(createResultTeam(match, team));
    });
    const details = document.createElement("div");
    details.className = "live-result-details";
    const facts = [
      ["Match result", completedResult],
      [
        "Top scorer",
        match.topPerformers?.mostRuns?.name
          ? `${match.topPerformers.mostRuns.name} · ${numberText(match.topPerformers.mostRuns.value, 0)} runs`
          : "Official figures unavailable",
      ],
      [
        "Top bowler",
        match.topPerformers?.mostWickets?.name
          ? `${match.topPerformers.mostWickets.name} · ${numberText(match.topPerformers.mostWickets.value, 0)} wickets`
          : "Official figures unavailable",
      ],
    ];
    facts.forEach(([label, value]) => {
      const item = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = label;
      item.append(strong, document.createTextNode(value));
      details.append(item);
    });
    const link = document.createElement("a");
    link.href = matchUrl(match.matchNumber);
    link.textContent = "Full Scorecard →";
    card.append(details, link);
    return card;
  };

  const renderResults = (matches) => {
    if (!resultsContainer) return;
    if (!matches?.length) {
      text(resultsStatus, "Results appear after each match");
      return;
    }
    resultsContainer.replaceChildren();
    if (resultsStatus) resultsStatus.hidden = true;
    matches.forEach((match, index) => {
      if (index === 0) {
        resultsContainer.append(renderFeaturedResult(match));
        return;
      }
      const card = document.createElement("article");
      card.className = "live-result-card";
      const label = document.createElement("span");
      label.textContent = `Match ${match.matchNumber} · ${match.status}`;
      const heading = document.createElement("h3");
      heading.textContent = match.description || match.stateOfPlay || "Match result";
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
      link.textContent = "Full Scorecard →";
      card.append(link);
      resultsContainer.append(card);
    });
  };

  const refreshScore = async () => {
    if (!endpoint || requestInProgress) return;
    requestInProgress = true;
    refreshButton?.classList.add("is-loading");
    if (refreshButton) refreshButton.disabled = true;
    setFeedSignal("Checking match update", "checking");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      const response = await fetch(endpoint, {
        cache: "default",
        priority: "high",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
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
      lastSuccessfulRefresh = Date.parse(payload.fetchedAt) || Date.now();
      const stale = Date.now() - lastSuccessfulRefresh > 120000;
      setFeedSignal(stale ? "Score update delayed" : "Live scores", stale ? "error" : "connected");
    } catch (error) {
      console.warn("CPL live score refresh unavailable", error);
      setFeedSignal("Score update delayed", "error");
      text(
        feedMessage,
        "New scores are temporarily delayed. The latest match update remains on screen.",
      );
    } finally {
      requestInProgress = false;
      refreshButton?.classList.remove("is-loading");
      if (refreshButton) refreshButton.disabled = false;
      root.dataset.hydrationState = "ready";
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
      text(countdownValue, isComplete(currentStatus) ? "Complete" : currentPhase);
      text(countdownLabel, isComplete(currentStatus) ? "Final result" : "Match status");
      text(heroCountdownValue, isComplete(currentStatus) ? "Complete" : currentPhase);
      text(heroCountdownLabel, isComplete(currentStatus) ? "Final result" : "Match status");
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
  window.addEventListener("focus", refreshScore);
  window.addEventListener("online", refreshScore);
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshScore();
  }, intervalSeconds * 1000);
  window.setInterval(updateClock, 1000);
  updateClock();
  refreshScore();
})();
