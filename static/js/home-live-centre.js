(() => {
  const root = document.querySelector("[data-home-live-centre]");
  if (!root) return;

  const teamMeta = new Map(
    [
      ["antiguaandbarbudafalcons", ["Antigua & Barbuda", "ABF", "antigua-barbuda-falcons"]],
      ["barbadostridents", ["Barbados", "BT", "barbados-royals"]],
      ["guyanaamazonwarriors", ["Guyana", "GAW", "guyana-amazon-warriors"]],
      ["jamaicakingsmen", ["Jamaica", "JAK", "jamaica-kingsmen"]],
      ["stluciakings", ["Saint Lucia", "SLK", "saint-lucia-kings"]],
      ["stkittsandnevispatriots", ["St Kitts & Nevis", "SKNP", "st-kitts-nevis-patriots"]],
      ["trinbagoknightriders", ["Trinidad & Tobago", "TKR", "trinbago-knight-riders"]],
    ],
  );
  const settledPattern = /complete|completed|closed|finished|final|abandon|cancel|no result/i;
  const upcomingPattern = /upcoming|scheduled|fixture|pre-match/i;
  const normalizeName = (value = "") =>
    String(value)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\bsaint\b/g, "st")
      .replace(/[^a-z0-9]/g, "");
  const isSettled = (match) => settledPattern.test(String(match?.status || ""));
  const isUpcoming = (match) => upcomingPattern.test(String(match?.status || ""));
  const isLive = (match) => Boolean(match?.status) && !isSettled(match) && !isUpcoming(match);
  const matchNumber = (match) => Number(match?.matchNumber) || 0;
  const matchPhase = (match) => match?.stateOfPlay || match?.description || match?.status || "Match in progress";

  const nextCard = root.querySelector(".home-match-centre-next");
  const countdown = nextCard?.querySelector("[data-match-countdown]");
  const livePanel = root.querySelector(".home-match-centre-live");
  const rail = root.querySelector("#home-match-slider");
  let requestInProgress = false;
  let initialRailPositioned = false;
  root.dataset.hydrationState = "ready";

  const fixtureTime = (fixture) => `${fixture?.label || "Fixture date"} · ${fixture?.time || "local time"} local`;
  const fullDate = (iso) => {
    const parsed = Date.parse(iso);
    if (!Number.isFinite(parsed)) return "Fixture date";
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Barbados",
    }).format(new Date(parsed));
  };

  const teamDetails = (team) => {
    const normalized = normalizeName(team?.name);
    const meta = teamMeta.get(normalized) || [team?.name || "CPL team", team?.shortName || "TBC", "teams"];
    return {
      name: String(team?.name || "Team to be confirmed").replace(/ And /g, " & "),
      territory: meta[0],
      short: meta[1],
      slug: meta[2],
      logo: `/static/img/official/teams/${meta[2]}.webp?v=20260726`,
    };
  };

  const renderFeatureMatch = (match, fixture) => {
    if (!nextCard || !match || !fixture) return;
    const number = matchNumber(match);
    const teams = (match.teams || []).slice(0, 2).map(teamDetails);
    if (teams.length !== 2) return;

    const eyebrow = nextCard.querySelector("header > span");
    const heading = nextCard.querySelector(".home-match-centre-next-main h3");
    if (eyebrow) eyebrow.lastChild.textContent = ` Match ${number}`;
    if (heading) heading.textContent = isLive(match) ? "Live tournament match" : "Next tournament match";

    const teamLinks = [...nextCard.querySelectorAll(".home-match-centre-teams > a")].slice(0, 2);
    teamLinks.forEach((link, index) => {
      const team = teams[index];
      link.href = `/team/${team.slug}/`;
      const image = link.querySelector("img");
      if (image) {
        image.src = team.logo;
        image.alt = `${team.name} official CPL logo`;
      }
      const territory = link.querySelector("span");
      const name = link.querySelector("strong");
      const short = link.querySelector("b");
      if (territory) territory.textContent = team.territory;
      if (name) name.textContent = team.name;
      if (short) short.textContent = team.short;
    });

    if (countdown) {
      countdown.dataset.countdownTarget = fixture.startIso || match.startDate || "";
      countdown.dataset.matchResolved = String(isLive(match));
      countdown.classList.remove("is-live", "is-complete");
      const label = countdown.querySelector("[data-match-countdown-label]");
      const time = countdown.querySelector("time");
      if (isLive(match)) countdown.classList.add("is-live");
      if (label) label.textContent = isLive(match) ? matchPhase(match) : "Starts in";
      if (time) {
        time.dateTime = fixture.startIso || match.startDate || "";
        time.textContent = isLive(match) ? scoreLine(match) : fixtureTime(fixture);
      }
    }

    const footerItems = nextCard.querySelectorAll("footer > p");
    const date = footerItems[0]?.querySelector("strong");
    const venue = footerItems[1]?.querySelector("a");
    if (date) date.textContent = fullDate(fixture.startIso || match.startDate);
    if (venue) venue.textContent = fixture.venue || match.venue?.name || "Venue to be confirmed";
    const matchLinks = nextCard.querySelectorAll("footer nav a");
    if (matchLinks[0]) matchLinks[0].href = fixture.url || "/schedule/";
  };

  const scoreLine = (match) => {
    const teams = (match?.teams || []).map(teamDetails);
    const scores = new Map(
      (match?.innings || []).map((innings) => [
        String(innings.battingTeamId || ""),
        `${innings.runs ?? "—"}/${innings.wickets ?? "—"}`,
      ]),
    );
    return teams
      .map((team, index) => {
        const sourceTeam = match.teams?.[index];
        return `${team.short} ${scores.get(String(sourceTeam?.id || "")) || "—"}`;
      })
      .join(" · ");
  };

  const renderLivePanel = (liveMatch, nextMatch, fixtureByNumber) => {
    if (!livePanel) return;
    const primary = liveMatch || nextMatch;
    if (!primary) return;
    const fixture = fixtureByNumber.get(matchNumber(primary));
    const teams = (primary.teams || []).slice(0, 2).map(teamDetails);
    const columns = livePanel.querySelectorAll(".home-match-centre-live-state > div");
    const leftLabel = columns[0]?.querySelector("span");
    const leftTitle = columns[0]?.querySelector("strong");
    const leftCopy = columns[0]?.querySelector("p");
    const rightLabel = columns[1]?.querySelector("span");
    const rightTitle = columns[1]?.querySelector("strong");
    const rightCopy = columns[1]?.querySelector("p");
    const rightVenue = columns[1]?.querySelector("small");

    if (liveMatch) {
      if (leftLabel) leftLabel.innerHTML = `<i aria-hidden="true"></i> ${matchPhase(liveMatch)}`;
      if (leftTitle) leftTitle.textContent = matchPhase(liveMatch);
      if (leftCopy) leftCopy.textContent = scoreLine(liveMatch);
      if (rightLabel) rightLabel.textContent = `Match ${matchNumber(liveMatch)}`;
    } else {
      if (leftLabel) leftLabel.innerHTML = '<i aria-hidden="true"></i> No live match';
      if (leftTitle) leftTitle.textContent = `Next coverage: Match ${matchNumber(nextMatch)}`;
      if (leftCopy) leftCopy.textContent = "Scores, toss and innings updates will appear here as they become available.";
      if (rightLabel) rightLabel.textContent = "Next coverage";
    }
    if (rightTitle && teams.length === 2) {
      rightTitle.innerHTML = `${teams[0].short} <b>VS</b> ${teams[1].short}`;
    }
    if (rightCopy) rightCopy.textContent = fixtureTime(fixture);
    if (rightVenue) rightVenue.textContent = fixture?.venue || primary.venue?.name || "Venue to be confirmed";
    const links = livePanel.querySelectorAll("footer a");
    if (links[1]) links[1].href = fixture?.url || "/schedule/";
  };

  const renderRailStatuses = (schedule) => {
    if (!rail) return;
    const statusByNumber = new Map(schedule.map((match) => [matchNumber(match), match]));
    const cards = [...rail.querySelectorAll(".match-rail-card")];
    let focusCard = null;
    cards.forEach((card) => {
      const numberText = card.querySelector(".match-rail-card-header span")?.textContent || "";
      const number = Number(numberText.match(/\d+/)?.[0]);
      const match = statusByNumber.get(number);
      if (!match) return;
      const status = card.querySelector(".match-rail-card-header strong");
      const visible = isSettled(match) ? "Complete" : isLive(match) ? "Live" : "Upcoming";
      if (status) status.textContent = visible;
      card.dataset.matchStatus = visible.toLowerCase();
      if (!focusCard && !isSettled(match)) focusCard = card;
    });
    if (!initialRailPositioned && focusCard) {
      initialRailPositioned = true;
      requestAnimationFrame(() => {
        rail.scrollLeft = Math.max(0, focusCard.offsetLeft - rail.offsetLeft);
      });
    }
  };

  const refresh = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    root.setAttribute("aria-busy", "true");
    try {
      const [liveResponse, fixtureResponse] = await Promise.all([
        fetch(root.dataset.liveScoreEndpoint || "/api/cpl-live-score", { cache: "no-store" }),
        fetch(root.dataset.fixtureEndpoint || "/static/match-spotlight.json", { cache: "no-store" }),
      ]);
      if (!liveResponse.ok || !fixtureResponse.ok) throw new Error("Homepage match feed unavailable");
      const [payload, fixtures] = await Promise.all([liveResponse.json(), fixtureResponse.json()]);
      if (!Array.isArray(payload.schedule) || !Array.isArray(fixtures)) {
        throw new Error("Homepage match feed is incomplete");
      }
      const fixtureByNumber = new Map(fixtures.map((fixture) => [Number(fixture.matchNumber), fixture]));
      const liveMatch = payload.schedule.find(isLive) || null;
      const nextMatch = payload.schedule.find((match) => !isSettled(match)) || null;
      const feature = liveMatch || nextMatch;
      if (feature) renderFeatureMatch(feature, fixtureByNumber.get(matchNumber(feature)));
      renderLivePanel(liveMatch, nextMatch, fixtureByNumber);
      renderRailStatuses(payload.schedule);
    } catch (error) {
      console.warn("CPL homepage live centre refresh unavailable", error);
    } finally {
      requestInProgress = false;
      root.removeAttribute("aria-busy");
      root.dataset.hydrationState = "ready";
    }
  };

  refresh();
  window.setInterval(() => {
    if (document.visibilityState === "visible") refresh();
  }, 15000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
})();
