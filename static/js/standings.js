(() => {
  const root = document.querySelector("[data-live-standings]");
  if (!root) return;

  const endpoint = root.dataset.standingsEndpoint;
  const clientKey = root.dataset.standingsClientKey;
  const tableBody = root.querySelector("[data-standings-body]");
  const rows = [...root.querySelectorAll("[data-standings-team]")];
  if (!endpoint || !clientKey || !tableBody || rows.length !== 7) return;

  const rowById = new Map(
    rows.map((row) => [row.dataset.officialTeamId, row])
  );
  const normalizeName = (value = "") =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\bsaint\b/g, "st")
      .replace(/[^a-z0-9]/g, "");
  const rowByName = new Map(
    rows.map((row) => [normalizeName(row.dataset.teamName), row])
  );

  const phase = root.querySelector("[data-standings-phase]");
  const checked = root.querySelector("[data-standings-checked]");
  const completed = root.querySelector("[data-standings-completed]");
  const heroCopy = root.querySelector("[data-standings-hero-copy]");
  const boardCopy = root.querySelector("[data-standings-board-copy]");
  const status = root.querySelector("[data-standings-status]");
  const statusDetail = root.querySelector("[data-standings-status-detail]");
  const tableNote = root.querySelector("[data-standings-table-note]");
  const updateTitle = root.querySelector("[data-standings-update-title]");
  const updateDetail = root.querySelector("[data-standings-update-detail]");

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatNrr = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const formatted = numeric.toFixed(3);
    return numeric > 0 ? `+${formatted}` : formatted;
  };
  const checkedTime = () =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date());

  const setPreseasonStatus = () => {
    if (checked) checked.textContent = `Standings checked ${checkedTime()}`;
    if (statusDetail) {
      statusDetail.textContent = "First update follows the opening result";
    }
    if (updateDetail) {
      updateDetail.textContent =
        "First update follows Jamaica Kingsmen vs Antigua & Barbuda Falcons";
    }
  };

  const applyStandings = (ladderTeams) => {
    const mapped = ladderTeams.map((team, sourceIndex) => {
      const row =
        rowById.get(team.teamId) ||
        rowByName.get(normalizeName(team.name || team.team || team.shortName));
      return { team, row, sourceIndex };
    });
    if (
      mapped.length !== rows.length ||
      mapped.some(({ row }) => !row) ||
      new Set(mapped.map(({ row }) => row)).size !== rows.length
    ) {
      throw new Error("Official standings team mapping is incomplete");
    }

    mapped.sort((a, b) => {
      const aRank = toNumber(a.team.rank ?? a.team.position);
      const bRank = toNumber(b.team.rank ?? b.team.position);
      if (aRank && bRank && aRank !== bRank) return aRank - bRank;
      return a.sourceIndex - b.sourceIndex;
    });

    let totalTeamMatches = 0;
    mapped.forEach(({ team, row }, index) => {
      const matches = toNumber(team.matches);
      const wins = toNumber(team.wins);
      const losses = toNumber(team.losses);
      const noResults = Math.max(
        0,
        toNumber(team.noResults ?? team.noResult ?? matches - wins - losses)
      );
      const values = {
        matches,
        wins,
        losses,
        noResults,
        netRunRate: formatNrr(team.netRunRate),
        points: toNumber(team.points),
      };
      Object.entries(values).forEach(([field, value]) => {
        const cell = row.querySelector(`[data-standing-field="${field}"]`);
        if (cell) cell.textContent = value;
      });
      const position = row.querySelector("[data-standing-position]");
      if (position) {
        position.textContent = String(index + 1).padStart(2, "0");
        position.setAttribute("aria-label", `Position ${index + 1}`);
      }
      tableBody.append(row);
      totalTeamMatches += matches;
    });

    const completedMatches = Math.floor(totalTeamMatches / 2);
    if (phase) phase.innerHTML = "<i></i> League underway";
    if (checked) checked.textContent = `Live table · ${checkedTime()}`;
    if (completed) completed.textContent = String(completedMatches).padStart(2, "0");
    if (heroCopy) {
      heroCopy.textContent =
        "The CPL 2026 points table records positions, wins, losses, points and net run rate after each result.";
    }
    if (boardCopy) {
      boardCopy.textContent =
        `${completedMatches} league ${completedMatches === 1 ? "match has" : "matches have"} been completed.`;
    }
    if (status) status.innerHTML = "<i></i> Live official standings";
    if (statusDetail) {
      statusDetail.textContent = `Updated ${checkedTime()} · refreshes every 30 seconds`;
    }
    if (tableNote) {
      tableNote.textContent =
        "The table reflects the latest CPL positions, points and net run rate.";
    }
    if (updateTitle) updateTitle.textContent = "CPL 2026 standings";
    if (updateDetail) {
      updateDetail.textContent = `Updated ${checkedTime()} · checks for new results every 30 seconds`;
    }
  };

  let requestInProgress = false;
  const refreshStandings = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    root.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(endpoint, {
        headers: { "sr-client-key": clientKey },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Standings request failed: ${response.status}`);
      const payload = await response.json();
      const ladder = Array.isArray(payload.ladders) ? payload.ladders[0] : null;
      const ladderTeams = Array.isArray(ladder?.teams) ? ladder.teams : [];
      if (ladderTeams.length === 0) {
        setPreseasonStatus();
        return;
      }
      applyStandings(ladderTeams);
    } catch (error) {
      if (statusDetail) {
        statusDetail.textContent =
          "Showing the latest standings · checking again soon";
      }
      console.warn("CPL standings refresh unavailable", error);
    } finally {
      requestInProgress = false;
      root.removeAttribute("aria-busy");
    }
  };

  refreshStandings();
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshStandings();
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshStandings();
  });
})();
