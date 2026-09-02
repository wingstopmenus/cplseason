(function teamResultsModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.CPLTeamResults = api;
    api.init();
  }
}(typeof globalThis === "object" ? globalThis : this, function createTeamResults() {
  "use strict";

  const completedPattern = /complete|completed|finished|result|abandon|cancel|no result/i;

  function normalizeTeamName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\bsaint\b/g, "st")
      .replace(/\band\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function formatOvers(value) {
    if (value === null || value === undefined || value === "") return "";
    const text = String(value);
    if (!text.includes(".")) return `${text}.0`;
    const [whole, balls] = text.split(".");
    return Number(balls) === 6 ? `${Number(whole) + 1}.0` : `${whole}.${balls}`;
  }

  function formatInningsScore(match, team) {
    const innings = (match.innings || [])
      .filter((entry) => String(entry.battingTeamId || "") === String(team.id || ""))
      .sort((left, right) => Number(left.inningsNumber || 0) - Number(right.inningsNumber || 0))
      .at(-1);
    if (!innings) return "";
    const wickets = Number(innings.wickets || 0);
    const score = wickets >= 10 ? String(innings.runs ?? 0) : `${innings.runs ?? 0}/${wickets}`;
    const overs = formatOvers(innings.overs);
    return `${team.shortName || team.name}: ${score}${overs ? ` (${overs})` : ""}`;
  }

  function normalizedResult(value) {
    return String(value || "Result available")
      .replace(/\bwkts\b/gi, "wickets")
      .replace(/\s+/g, " ")
      .trim();
  }

  function belongsToTeam(match, aliases, leagueMatchNumbers) {
    if (leagueMatchNumbers.has(Number(match.matchNumber))) return true;
    const aliasKeys = new Set(aliases.map(normalizeTeamName).filter(Boolean));
    return (match.teams || []).some((team) => aliasKeys.has(normalizeTeamName(team.name)));
  }

  function buildTeamResults(matches, schedule, aliases, leagueMatchNumbers = new Set()) {
    const scheduleByNumber = new Map((schedule || []).map((match) => [Number(match.matchNumber), match]));
    return (matches || [])
      .filter((match) => completedPattern.test(String(match.status || match.description || match.stateOfPlay || "")))
      .filter((match) => belongsToTeam(match, aliases, leagueMatchNumbers))
      .map((match) => {
        const matchNumber = Number(match.matchNumber);
        const fixture = scheduleByNumber.get(matchNumber) || {};
        const scores = (match.teams || []).map((team) => formatInningsScore(match, team)).filter(Boolean);
        return {
          matchNumber,
          label: fixture.label || `Match ${matchNumber}`,
          title: fixture.home && fixture.away ? `${fixture.home} vs ${fixture.away}` : String(match.title || "CPL 2026 match"),
          score: scores.join(" · "),
          result: normalizedResult(match.description || match.stateOfPlay || match.status),
          url: fixture.url || `/live-score/?match=${matchNumber}`,
        };
      })
      .sort((left, right) => right.matchNumber - left.matchNumber);
  }

  function appendTextElement(documentRef, parent, tagName, className, text) {
    const element = documentRef.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function renderResults(rootElement, results) {
    const documentRef = rootElement.ownerDocument;
    const status = rootElement.querySelector("[data-team-results-status]");
    const list = rootElement.querySelector("[data-team-results-list]");
    if (!status || !list) return;
    list.replaceChildren();
    if (!results.length) {
      status.hidden = false;
      status.classList.add("is-empty");
      status.textContent = "No completed CPL 2026 matches for this team yet.";
      list.hidden = true;
      return;
    }
    results.forEach((result) => {
      const item = documentRef.createElement("li");
      const time = appendTextElement(documentRef, item, "time", "", result.label);
      appendTextElement(documentRef, time, "small", "", `Match ${result.matchNumber}`);
      const match = documentRef.createElement("div");
      appendTextElement(documentRef, match, "strong", "", result.title);
      if (result.score) appendTextElement(documentRef, match, "small", "team-profile-result-score", result.score);
      item.append(match);
      appendTextElement(documentRef, item, "span", "team-profile-result-outcome", result.result);
      const link = appendTextElement(documentRef, item, "a", "", "Scorecard →");
      link.href = result.url;
      list.append(item);
    });
    status.hidden = true;
    status.classList.remove("is-empty", "is-error");
    list.hidden = false;
  }

  async function refresh(rootElement) {
    if (rootElement.dataset.resultsLoading === "true") return;
    rootElement.dataset.resultsLoading = "true";
    const status = rootElement.querySelector("[data-team-results-status]");
    try {
      const [feedResponse, scheduleResponse] = await Promise.all([
        fetch("/api/cpl-live-score", { cache: "no-store" }),
        fetch("/static/match-spotlight.json", { cache: "force-cache" }),
      ]);
      if (!feedResponse.ok || !scheduleResponse.ok) throw new Error("Official results feed unavailable");
      const [feed, schedule] = await Promise.all([feedResponse.json(), scheduleResponse.json()]);
      if (feed.source !== "official-cpl-mcpro" || !Array.isArray(feed.recent) || !Array.isArray(schedule)) {
        throw new Error("Official results response is invalid");
      }
      const aliases = String(rootElement.dataset.teamAliases || "").split("|").filter(Boolean);
      const leagueMatchNumbers = new Set(
        [...document.querySelectorAll("[data-team-fixture][data-match-number]")]
          .map((fixture) => Number(fixture.dataset.matchNumber))
          .filter(Number.isFinite),
      );
      const results = buildTeamResults(feed.recent, schedule, aliases, leagueMatchNumbers);
      const signature = JSON.stringify(results);
      if (signature !== rootElement.dataset.resultsSignature) {
        renderResults(rootElement, results);
        rootElement.dataset.resultsSignature = signature;
      }
      rootElement.dataset.resultsReady = "true";
    } catch (error) {
      if (rootElement.dataset.resultsReady !== "true" && status) {
        status.hidden = false;
        status.classList.add("is-error");
        status.textContent = "Latest verified results are temporarily unavailable. Please try again shortly.";
      }
      console.warn("CPL team results refresh unavailable", error);
    } finally {
      rootElement.dataset.resultsLoading = "false";
    }
  }

  function init() {
    const roots = [...document.querySelectorAll("[data-team-results]")];
    roots.forEach((rootElement) => {
      refresh(rootElement);
      window.setInterval(() => {
        if (document.visibilityState === "visible") refresh(rootElement);
      }, 30000);
    });
  }

  return {
    belongsToTeam,
    buildTeamResults,
    formatInningsScore,
    formatOvers,
    normalizeTeamName,
    normalizedResult,
    renderResults,
    init,
  };
}));
