(() => {
  const roots = [...document.querySelectorAll("[data-live-standings]")];
  if (!roots.length) return;

  const normalizeName = (value = "") =>
    String(value)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\bsaint\b/g, "st")
      .replace(/[^a-z0-9]/g, "");

  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatNrr = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "—";
    const formatted = parsed.toFixed(3);
    return parsed > 0 ? `+${formatted}` : formatted;
  };

  const checkedTime = (iso) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(iso ? new Date(iso) : new Date());

  const setText = (root, selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };

  const applyToRoot = (root, payload) => {
    const tableBody = root.querySelector("[data-standings-body]");
    const rows = [...root.querySelectorAll("[data-standings-team]")];
    if (!tableBody || rows.length !== 7 || !Array.isArray(payload.standings)) return;

    const rowById = new Map(
      rows.map((row) => [String(row.dataset.officialTeamId || ""), row]),
    );
    const rowByName = new Map(
      rows.map((row) => [normalizeName(row.dataset.teamName), row]),
    );
    const mapped = payload.standings.map((team, sourceIndex) => ({
      team,
      sourceIndex,
      row:
        rowById.get(String(team.teamId || "")) ||
        rowByName.get(normalizeName(team.name)),
    }));
    if (
      mapped.length !== rows.length ||
      mapped.some(({ row }) => !row) ||
      new Set(mapped.map(({ row }) => row)).size !== rows.length
    ) {
      throw new Error("Verified standings team mapping is incomplete");
    }

    mapped.sort(
      (a, b) => number(a.team.rank) - number(b.team.rank) || a.sourceIndex - b.sourceIndex,
    );
    mapped.forEach(({ team, row }, index) => {
      const values = {
        matches: number(team.matches),
        wins: number(team.wins),
        losses: number(team.losses),
        noResults: number(team.noResults),
        netRunRate: formatNrr(team.netRunRate),
        points: number(team.points),
      };
      Object.entries(values).forEach(([field, value]) => {
        const cell = row.querySelector(`[data-standing-field="${field}"]`);
        if (cell) cell.textContent = value;
      });
      const position = row.querySelector("[data-standing-position]");
      if (position) {
        const label = String(index + 1).padStart(root.dataset.standingsSurface === "full" ? 2 : 1, "0");
        position.textContent = label;
        position.setAttribute("aria-label", `Position ${index + 1}`);
      }
      tableBody.append(row);
    });

    const completed = number(payload.completedMatches);
    const matchWord = completed === 1 ? "match" : "matches";
    const updateTime = checkedTime(payload.fetchedAt);
    const isOfficialLadder = payload.source === "official-cpl-ladder";
    const isEspnFallback = payload.source === "espncricinfo-verified-fallback";
    setText(root, "[data-standings-checked]", `Updated ${updateTime}`);
    setText(root, "[data-standings-completed]", String(completed).padStart(2, "0"));
    setText(
      root,
      "[data-standings-hero-copy]",
      "CPL 2026 positions, wins, losses, points and net run rate update automatically after verified results.",
    );
    setText(
      root,
      "[data-standings-board-copy]",
      `${completed} league ${matchWord} ${completed === 1 ? "has" : "have"} been completed.`,
    );
    setText(
      root,
      "[data-standings-status-detail]",
      `Updated ${updateTime} · refreshes every 30 seconds`,
    );
    setText(
      root,
      "[data-standings-table-note]",
      `Current after ${completed} completed ${matchWord}. ${
        isOfficialLadder
          ? "Figures match the official CPL ladder."
          : isEspnFallback
            ? "Figures are verified against ESPNcricinfo while the CPL feed reconnects."
            : "Figures use verified final scorecards while the official ladder catches up."
      }`,
    );
    setText(root, "[data-standings-update-title]", "CPL 2026 standings are live");
    setText(
      root,
      "[data-standings-update-detail]",
      `Updated ${updateTime} · checks for confirmed results every 30 seconds`,
    );
    setText(root, "[data-standings-phase]", completed ? "League underway" : "Season table");
    setText(root, "[data-standings-status]", "Live verified standings");
    setText(root, "[data-home-standings-badge]", completed ? "Live standings" : "Season standings");
    setText(
      root,
      "[data-home-standings-copy]",
      completed
        ? `Updated automatically after ${completed} completed ${matchWord}.`
        : "The table updates automatically after each verified result.",
    );
  };

  let requestInProgress = false;
  let lastPayload = null;
  const refresh = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    roots.forEach((root) => root.setAttribute("aria-busy", "true"));
    try {
      const endpoint = roots[0].dataset.standingsEndpoint || "/api/cpl-standings";
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(`Standings request failed: ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.standings) || payload.standings.length !== 7) {
        throw new Error("Standings response is incomplete");
      }
      roots.forEach((root) => applyToRoot(root, payload));
      lastPayload = payload;
    } catch (error) {
      roots.forEach((root) => {
        setText(
          root,
          "[data-standings-status-detail]",
          lastPayload
            ? "Showing the latest verified table · checking again soon"
            : "Live update unavailable · showing the saved table",
        );
        setText(
          root,
          "[data-home-standings-copy]",
          lastPayload
            ? "Showing the latest verified standings while the feed reconnects."
            : "Live update is reconnecting; saved standings remain visible.",
        );
      });
      console.warn("CPL standings refresh unavailable", error);
    } finally {
      requestInProgress = false;
      roots.forEach((root) => root.removeAttribute("aria-busy"));
    }
  };

  refresh();
  window.setInterval(() => {
    if (document.visibilityState === "visible") refresh();
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);
})();
