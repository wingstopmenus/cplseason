const MATCHES_ENDPOINT =
  "https://api.mcpro.cricket/v1/matches?competitionId=sr:tournament:16628";
const CPL_CLIENT_KEY = "c7b9bd69-0eee-4676-beee-fbbee46fccee";

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

    const statusFeed = matches
      .map((match) => ({
        matchNumber: Number(match?.competition?.matchNumber),
        status: String(match?.status || ""),
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
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=15, stale-while-revalidate=60",
    );
    response.setHeader("X-CPL-Match-Status-Source", "schedule-fallback");
    return response.status(200).json([]);
  }
};
