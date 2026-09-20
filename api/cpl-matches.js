const MATCHES_ENDPOINT =
  "https://api.mcpro.cricket/v1/matches?competitionId=sr:tournament:16628";
const CPL_CLIENT_KEY = "c7b9bd69-0eee-4676-beee-fbbee46fccee";
const completedPattern = /complete|completed|result|abandon|cancel|no result/i;

module.exports = async function cplMatches(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(MATCHES_ENDPOINT, {
      headers: { "sr-client-key": CPL_CLIENT_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      throw new Error(`Official match feed returned ${upstream.status}`);
    }

    const matches = await upstream.json();
    if (!Array.isArray(matches)) {
      throw new Error("Official match feed returned an invalid response");
    }

    const now = Date.now();
    const activeCandidates = matches.filter((match) => {
      if (!match?.matchId || completedPattern.test(String(match?.status || ""))) return false;
      const start = Date.parse(match?.startDate || "");
      return Number.isFinite(start) && start <= now && now - start < 12 * 60 * 60 * 1000;
    });
    const activeDetails = await Promise.all(activeCandidates.map(async (match) => {
      try {
        const detailResponse = await fetch(`https://api.mcpro.cricket/v1/match/${match.matchId}`, {
          headers: { "sr-client-key": CPL_CLIENT_KEY },
          signal: AbortSignal.timeout(8000),
        });
        return detailResponse.ok ? detailResponse.json() : null;
      } catch {
        return null;
      }
    }));
    const detailStatus = new Map(
      activeDetails
        .filter(Boolean)
        .map((match) => {
          const status = String(match.status || "");
          const stateOfPlay = String(match.stateOfPlay || "");
          const effectiveStatus = /upcoming|scheduled|fixture|pre-match/i.test(status) && stateOfPlay
            ? stateOfPlay
            : status || stateOfPlay;
          return [String(match.matchId || ""), effectiveStatus];
        }),
    );

    const statusFeed = matches
      .map((match) => ({
        matchNumber: Number(match?.competition?.matchNumber),
        status: detailStatus.get(String(match?.matchId || "")) || String(match?.status || ""),
      }))
      .filter(
        (match) =>
          Number.isInteger(match.matchNumber) &&
          match.matchNumber >= 1 &&
          match.matchNumber <= 39,
      )
      .sort((a, b) => a.matchNumber - b.matchNumber);

    response.setHeader(
      "Cache-Control",
      "public, s-maxage=15, stale-while-revalidate=60",
    );
    return response.status(200).json(statusFeed);
  } catch (error) {
    try {
      const { fetchCricbuzzSchedule } = require("./cpl-live-score");
      const matches = await fetchCricbuzzSchedule();
      response.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
      response.setHeader("X-CPL-Match-Status-Source", "cricbuzz-match-index");
      return response.status(200).json(matches.map((match) => ({
        matchNumber: match.matchNumber,
        status: match.status === "completed" ? "Completed" : match.status === "live" ? "Live" : "Scheduled",
      })));
    } catch (fallbackError) {
      console.error("CPL Cricbuzz match status fallback unavailable:", fallbackError);
    }
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=15, stale-while-revalidate=60",
    );
    response.setHeader("X-CPL-Match-Status-Source", "upstream-error");
    console.error("CPL match status feed unavailable:", error);
    return response.status(503).json({ error: "CPL match status feed unavailable" });
  }
};
