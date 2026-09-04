"use strict";

function mergeOfficialMatchDetail(listMatch, detailMatch) {
  const summary = {
    ...(listMatch || {}),
    ...(detailMatch || {}),
    competition: {
      ...(listMatch?.competition || {}),
      ...(detailMatch?.competition || {}),
    },
  };

  const detailInnings = Array.isArray(detailMatch?.inningsScores)
    ? detailMatch.inningsScores
    : [];
  const listInnings = Array.isArray(listMatch?.inningsScores)
    ? listMatch.inningsScores
    : [];
  summary.inningsScores = detailInnings.length ? detailInnings : listInnings;

  return summary;
}

function normalizeCricketOvers(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const completedOvers = Math.trunc(parsed);
  const balls = Math.round((parsed - completedOvers) * 10);
  if (balls < 6) return parsed;
  const normalizedOvers = completedOvers + Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return Number(`${normalizedOvers}.${remainingBalls}`);
}

module.exports = { mergeOfficialMatchDetail, normalizeCricketOvers };
