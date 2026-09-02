"use strict";

const PLAYERS_PER_XI = 11;

function comparableTeamName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/saint/g, "st")
    .replace(/[^a-z0-9]/g, "");
}

function extractJsonObject(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  return "";
}

function normalizedPlayers(players) {
  if (!Array.isArray(players)) return null;
  const playingXi = players
    .filter((player) => player && player.substitute !== true)
    .map((player) => ({
      name: String(player.name || player.fullName || "").trim(),
      captain: Boolean(player.captain),
      wicketKeeper: Boolean(player.keeper || player.wicketKeeper),
    }))
    .filter((player) => player.name);
  const uniqueNames = new Set(
    playingXi.map((player) => player.name.toLowerCase()),
  );
  if (
    playingXi.length !== PLAYERS_PER_XI ||
    uniqueNames.size !== PLAYERS_PER_XI
  ) {
    return null;
  }
  return playingXi;
}

function parseConfirmedPlayingXi(html, expectedTeams) {
  if (!Array.isArray(expectedTeams) || expectedTeams.length !== 2) return null;
  const expected = expectedTeams.map((team) => ({
    name: String(team?.name || ""),
    key: comparableTeamName(team?.name),
  }));
  if (expected.some((team) => !team.key)) return null;

  const source = String(html || "")
    .replace(/\\\"/g, '"')
    .replace(/\\\\/g, "\\");
  const candidates = new Map();
  const teamPattern = /"team[12]":\{/g;
  for (const match of source.matchAll(teamPattern)) {
    const objectStart = source.indexOf("{", match.index);
    const rawTeam = extractJsonObject(source, objectStart);
    if (!rawTeam) continue;
    try {
      const team = JSON.parse(rawTeam);
      const key = comparableTeamName(team?.name);
      const players = normalizedPlayers(team?.playerDetails);
      if (key && players) candidates.set(key, players);
    } catch {
      // Other embedded team objects may not be standalone JSON.
    }
  }

  const lineups = expected.map((team) => ({
    teamName: team.name,
    players: candidates.get(team.key) || [],
  }));
  if (
    lineups.some((lineup) => lineup.players.length !== PLAYERS_PER_XI)
  ) {
    return null;
  }
  return lineups;
}

function parseVerifiedMatchIndex(html, seriesId) {
  const source = String(html || "")
    .replace(/\\\"/g, '"')
    .replace(/\\\\/g, "\\");
  const matches = new Map();
  const matchInfoPattern = /"matchInfo":\{/g;
  for (const match of source.matchAll(matchInfoPattern)) {
    const objectStart = source.indexOf("{", match.index);
    const rawMatch = extractJsonObject(source, objectStart);
    if (!rawMatch) continue;
    try {
      const info = JSON.parse(rawMatch);
      const currentSeriesId = Number(info?.seriesId ?? info?.series?.id);
      const matchId = Number(info?.matchId);
      const start = Number(info?.startDate ?? info?.matchStartTimestamp);
      if (
        currentSeriesId === Number(seriesId) &&
        Number.isFinite(matchId) &&
        Number.isFinite(start)
      ) {
        matches.set(matchId, { matchId, start });
      }
    } catch {
      // Ignore unrelated or incomplete embedded data fragments.
    }
  }
  return new Map(
    [...matches.values()]
      .sort((left, right) => left.start - right.start)
      .map((match, index) => [
        index + 1,
        `https://www.cricbuzz.com/live-cricket-scores/${match.matchId}`,
      ]),
  );
}

function cloneLineups(lineups) {
  return lineups.map((lineup) => ({
    teamName: lineup.teamName,
    players: lineup.players.map((player) => ({ ...player })),
  }));
}

async function loadConfirmedPlayingXi(match, dependencies) {
  if (!match?.toss) return null;
  const teams = Array.isArray(match?.teams) ? match.teams : [];
  if (teams.length !== 2) return null;

  const cacheKey = String(match.matchId || match.matchNumber || "");
  const cache = dependencies?.cache;
  if (cacheKey && cache?.has(cacheKey)) {
    return cloneLineups(cache.get(cacheKey));
  }

  const matchUrl = await dependencies?.resolveMatchUrl?.(match.matchNumber);
  if (!matchUrl) return null;
  const html = await dependencies?.fetchPage?.(matchUrl);
  const lineups = parseConfirmedPlayingXi(html, teams);
  if (!lineups) return null;

  if (cacheKey && cache) cache.set(cacheKey, cloneLineups(lineups));
  return lineups;
}

module.exports = {
  PLAYERS_PER_XI,
  loadConfirmedPlayingXi,
  parseConfirmedPlayingXi,
  parseVerifiedMatchIndex,
};
