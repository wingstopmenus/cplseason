(function attachMatchTitle(globalObject, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalObject) globalObject.CplMatchTitle = api;
})(typeof window !== "undefined" ? window : globalThis, function createMatchTitle() {
  const COMPETITION = "Caribbean Premier League 2026";
  const CARIBBEAN_TIME_ZONE = "America/Port_of_Spain";
  const upcomingPattern = /upcoming|scheduled|fixture|pre-match/i;
  const completePattern = /complete|completed|result|abandon|cancel|no result/i;
  const titleShortNames = new Map([
    ["antiguaandbarbudafalcons", "ABF"],
    ["barbadostridents", "BBT"],
    ["guyanaamazonwarriors", "GAW"],
    ["jamaicakingsmen", "JKM"],
    ["stkittsandnevispatriots", "SNP"],
    ["saintluciakings", "SLK"],
    ["trinbagoknightriders", "TKR"],
  ]);

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const ordinal = (value) => {
    const number = Number(value);
    if (!Number.isInteger(number)) return "Match";
    const remainder = number % 100;
    if (remainder >= 11 && remainder <= 13) return `${number}th`;
    return `${number}${{ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th"}`;
  };

  const isFixtureToday = (startIso, now) => {
    const fixtureDate = clean(startIso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const current = now instanceof Date ? now : new Date(now || Date.now());
    if (!fixtureDate || Number.isNaN(current.getTime())) return false;
    return Number(fixtureDate[1]) === current.getFullYear()
      && Number(fixtureDate[2]) === current.getMonth() + 1
      && Number(fixtureDate[3]) === current.getDate();
  };

  const longDate = (startIso) => {
    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: CARIBBEAN_TIME_ZONE,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(start);
  };

  const matchLabel = (matchNumber, stage) => {
    const verifiedStage = clean(stage);
    if (verifiedStage && !/league(?: stage)?|caribbean premier league/i.test(verifiedStage)) {
      return verifiedStage;
    }
    return `${ordinal(matchNumber)} Match`;
  };

  const teamName = (team, fallback) => clean(team?.name || fallback || "TBC")
    .replace(/^St\.\s+/i, "St ")
    .replace(/\s+And\s+/g, " and ");
  const teamShortName = (team) => {
    const comparableName = teamName(team).toLowerCase().replace(/[^a-z0-9]/g, "");
    return titleShortNames.get(comparableName)
      || clean(team?.shortName || team?.short || team?.name || "TBC");
  };

  const displayOvers = (value) => {
    const overs = Number(value);
    if (!Number.isFinite(overs)) return "";
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 10);
    return String(balls >= 6 ? wholeOvers + Math.floor(balls / 6) : overs);
  };

  const inningsScore = (innings, teams, includeOvers = false) => {
    if (!innings || !Number.isFinite(Number(innings.runs))) return "";
    const team = teams.find((entry) => String(entry?.id) === String(innings.battingTeamId));
    const wickets = Number.isFinite(Number(innings.wickets)) ? `/${Number(innings.wickets)}` : "";
    const overs = includeOvers && Number.isFinite(Number(innings.overs))
      ? ` (${displayOvers(innings.overs)})`
      : "";
    return `${teamShortName(team)} ${Number(innings.runs)}${wickets}${overs}`;
  };

  const scorePrefix = (match) => {
    const teams = Array.isArray(match?.teams) ? match.teams.slice(0, 2) : [];
    const innings = Array.isArray(match?.innings)
      ? match.innings.filter((entry) => Number.isFinite(Number(entry?.runs)))
      : [];
    if (!innings.length) return "";
    const current = innings[innings.length - 1];
    const other = innings.slice(0, -1).reverse().find(
      (entry) => String(entry.battingTeamId) !== String(current.battingTeamId),
    );
    return [inningsScore(current, teams, true), inningsScore(other, teams)].filter(Boolean).join(" vs ");
  };

  const batterSummary = (match) => {
    const batters = Array.isArray(match?.live?.batters) ? match.live.batters.slice(0, 2) : [];
    const values = batters.map((player) => {
      const name = clean(player?.name);
      if (!name || !Number.isFinite(Number(player?.runs)) || !Number.isFinite(Number(player?.balls))) return "";
      return `${name} ${Number(player.runs)}(${Number(player.balls)})`;
    }).filter(Boolean);
    return values.length ? ` (${values.join(" ")})` : "";
  };

  const resultSummary = (match) => {
    const candidates = [match?.description, match?.stateOfPlay]
      .map(clean)
      .filter((value) => value && !/^(complete|completed|result|match complete|match completed)$/i.test(value));
    if (candidates[0]) return candidates[0];
    return match?.winnerName ? `${clean(match.winnerName)} won` : "Match completed";
  };

  const build = (match, context = {}) => {
    const teams = Array.isArray(match?.teams) ? match.teams.slice(0, 2) : [];
    const home = teamName(teams[0], context.homeName);
    const away = teamName(teams[1], context.awayName);
    const number = Number(match?.matchNumber || context.matchNumber);
    const status = clean(match?.status || "Scheduled");
    const isUpcoming = upcomingPattern.test(status);
    const isComplete = completePattern.test(status);
    const startIso = match?.startDate || context.startIso;
    const date = isUpcoming && isFixtureToday(startIso, context.now)
      ? "Today"
      : longDate(startIso);
    const fixture = [
      `${home} vs ${away}`,
      matchLabel(number, context.stage || match?.stage),
      COMPETITION,
      date,
      COMPETITION,
    ].filter(Boolean).join(", ");
    const scores = scorePrefix(match);
    if (isComplete) {
      const result = resultSummary(match);
      return `${scores ? `${scores} (${result})` : result} | ${fixture}`;
    }
    if (!isUpcoming && scores) return `${scores}${batterSummary(match)} | ${fixture}`;
    return fixture;
  };

  return { build, ordinal };
});
