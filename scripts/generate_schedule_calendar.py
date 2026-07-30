"""Generate the downloadable CPL 2026 calendar from match and venue data."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\n", "\\n")
    )


def fold(line: str) -> list[str]:
    if len(line.encode("utf-8")) <= 73:
        return [line]
    parts: list[str] = []
    current = ""
    for character in line:
        candidate = current + character
        if current and len(candidate.encode("utf-8")) > 73:
            parts.append(current)
            current = " " + character
        else:
            current = candidate
    if current:
        parts.append(current)
    return parts


def main() -> None:
    venues = {
        path.stem: json.loads(path.read_text(encoding="utf-8"))
        for path in (ROOT / "data" / "venues").glob("*.json")
    }
    matches = sorted(
        (
            json.loads(path.read_text(encoding="utf-8"))
            for path in (ROOT / "data" / "matches").glob("*.json")
        ),
        key=lambda match: match["match_number"],
    )

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CPL Season//CPL 2026 Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:CPL 2026 Schedule",
        "X-WR-CALDESC:All 39 Caribbean Premier League 2026 matches",
    ]

    for match in matches:
        start = datetime.fromisoformat(match["start_iso"])
        end = start + timedelta(hours=4)
        venue = venues[match["venue_slug"]]
        summary = (
            f"{match['home_team_label']} vs {match['away_team_label']}"
            if match["home_team_label"] and match["away_team_label"]
            else match["stage"]
        )
        description = (
            f"CPL 2026 {match['stage']}. "
            f"Match centre: https://cplseason.com/match/{match['slug']}/"
        )
        event = [
            "BEGIN:VEVENT",
            f"UID:cpl2026-match-{match['match_number']}@cplseason.com",
            "DTSTAMP:20260730T000000Z",
            f"DTSTART:{start.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
            f"DTEND:{end.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
            f"SUMMARY:{escape(summary)}",
            f"LOCATION:{escape(venue['name'] + ', ' + venue['territory'])}",
            f"DESCRIPTION:{escape(description)}",
            f"URL:https://cplseason.com/match/{match['slug']}/",
            "STATUS:CONFIRMED",
            "END:VEVENT",
        ]
        for line in event:
            lines.extend(fold(line))

    lines.append("END:VCALENDAR")
    output = ROOT / "static" / "cpl-2026-schedule.ics"
    output.write_text("\r\n".join(lines) + "\r\n", encoding="utf-8")
    print(f"Generated {output.relative_to(ROOT)} with {len(matches)} events")


if __name__ == "__main__":
    main()
