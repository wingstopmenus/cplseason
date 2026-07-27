#!/usr/bin/env python3
"""Generate one structured match record for every CPL 2026 fixture."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATCH_DIR = ROOT / "data" / "matches"
LAST_UPDATED = "2026-07-27"
COMPETITION = "Republic Bank Caribbean Premier League 2026"

VENUE_TIMEZONES = {
    "arnos-vale-stadium": ("America/St_Vincent", "-04:00"),
    "sabina-park": ("America/Jamaica", "-05:00"),
    "daren-sammy-cricket-ground": ("America/St_Lucia", "-04:00"),
    "sir-vivian-richards-stadium": ("America/Antigua", "-04:00"),
    "brian-lara-cricket-academy": ("America/Port_of_Spain", "-04:00"),
    "warner-park": ("America/St_Kitts", "-04:00"),
    "providence-stadium": ("America/Guyana", "-04:00"),
    "kensington-oval": ("America/Barbados", "-04:00"),
}

PLAYOFFS = {
    "Eliminator (3rd vs 4th)": {
        "slug": "cpl-2026-eliminator",
        "stage": "Eliminator",
        "home_team_label": "Third-place team",
        "away_team_label": "Fourth-place team",
        "preview_heading": "Third and fourth meet with the season on the line",
        "preview": (
            "The teams finishing third and fourth in the league table meet in "
            "the CPL 2026 Eliminator at Kensington Oval. The winner advances "
            "to Qualifier 2; the losing team is eliminated."
        ),
    },
    "Qualifier 1 (1st vs 2nd)": {
        "slug": "cpl-2026-qualifier-1",
        "stage": "Qualifier 1",
        "home_team_label": "First-place team",
        "away_team_label": "Second-place team",
        "preview_heading": "The top two play for the first place in the final",
        "preview": (
            "The top two teams from the CPL 2026 league stage meet in Qualifier "
            "1 at Kensington Oval. The winner reaches the final, while the "
            "loser receives a second opportunity in Qualifier 2."
        ),
    },
    "Qualifier 2 (Winner Eliminator vs Loser Q1)": {
        "slug": "cpl-2026-qualifier-2",
        "stage": "Qualifier 2",
        "home_team_label": "Eliminator winner",
        "away_team_label": "Qualifier 1 loser",
        "preview_heading": "One final place remains",
        "preview": (
            "The Eliminator winner faces the losing team from Qualifier 1 at "
            "Kensington Oval. This is the last route into the CPL 2026 final, "
            "with the winner progressing and the loser leaving the tournament."
        ),
    },
    "CPL 2026 Final": {
        "slug": "cpl-2026-final",
        "stage": "Final",
        "home_team_label": "Qualifier 1 winner",
        "away_team_label": "Qualifier 2 winner",
        "preview_heading": "The CPL 2026 title will be decided in Bridgetown",
        "preview": (
            "The winners of Qualifier 1 and Qualifier 2 meet under the lights "
            "at Kensington Oval for the CPL 2026 championship. The confirmed "
            "finalists will appear here once the playoff results are known."
        ),
    },
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", value.lower())).strip("-")


def parse_time(value: str) -> str:
    match = re.fullmatch(r"(\d{1,2})(?::(\d{2}))?(am|pm)", value.strip().lower())
    if not match:
        raise ValueError(f"Unsupported fixture time: {value}")
    hour = int(match.group(1))
    minute = int(match.group(2) or "0")
    if match.group(3) == "pm" and hour != 12:
        hour += 12
    if match.group(3) == "am" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute:02d}"


def main() -> None:
    teams = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "teams").glob("*.json"))
    }
    team_by_schedule_name = {
        alias: team
        for team in teams.values()
        for alias in team["schedule_names"]
    }
    venues = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }

    fixtures = []
    for venue in venues.values():
        timezone, offset = VENUE_TIMEZONES[venue["slug"]]
        for fixture in venue["fixtures"]:
            local_time = parse_time(fixture["time"])
            fixtures.append(
                {
                    **fixture,
                    "venue": venue,
                    "timezone": timezone,
                    "offset": offset,
                    "start_time_local": local_time,
                    "sort_key": datetime.fromisoformat(
                        f"{fixture['date']}T{local_time}:00"
                    ),
                }
            )
    fixtures.sort(key=lambda fixture: fixture["sort_key"])

    MATCH_DIR.mkdir(parents=True, exist_ok=True)
    expected_slugs = set()
    for number, fixture in enumerate(fixtures, start=1):
        matchup = fixture["match"]
        playoff = PLAYOFFS.get(matchup)
        if playoff:
            record = {
                "slug": playoff["slug"],
                "match_number": number,
                "competition": COMPETITION,
                "stage": playoff["stage"],
                "home_team_slug": None,
                "away_team_slug": None,
                "home_team_label": playoff["home_team_label"],
                "away_team_label": playoff["away_team_label"],
                "venue_slug": fixture["venue"]["slug"],
                "date": fixture["date"],
                "start_time_local": fixture["start_time_local"],
                "timezone": fixture["timezone"],
                "start_iso": (
                    f"{fixture['date']}T{fixture['start_time_local']}:00"
                    f"{fixture['offset']}"
                ),
                "status": "Scheduled",
                "official_match_center_url": None,
                "preview_heading": playoff["preview_heading"],
                "preview": playoff["preview"],
                "preview_detail": (
                    "Team names, confirmed squads and playing XIs will update "
                    "after qualification is settled. No participant is listed "
                    "before the relevant result is official."
                ),
                "last_updated": LAST_UPDATED,
            }
        else:
            home_name, away_name = matchup.split(" vs ", 1)
            home_team = team_by_schedule_name[home_name]
            away_team = team_by_schedule_name[away_name]
            slug = f"{home_team['slug']}-vs-{away_team['slug']}"
            first_match_url = (
                "https://match-center.cplt20.com/"
                "b2c9b6b0-f520-4c15-99ec-b5af6e76d1b1/scorecard"
                if number == 1
                else None
            )
            record = {
                "slug": slug,
                "match_number": number,
                "competition": COMPETITION,
                "stage": "League stage",
                "home_team_slug": home_team["slug"],
                "away_team_slug": away_team["slug"],
                "home_team_label": home_team["name"],
                "away_team_label": away_team["name"],
                "venue_slug": fixture["venue"]["slug"],
                "date": fixture["date"],
                "start_time_local": fixture["start_time_local"],
                "timezone": fixture["timezone"],
                "start_iso": (
                    f"{fixture['date']}T{fixture['start_time_local']}:00"
                    f"{fixture['offset']}"
                ),
                "status": "Scheduled",
                "official_match_center_url": first_match_url,
                "preview_heading": (
                    f"{home_team['short_name']} meet {away_team['short_name']} "
                    f"in {fixture['venue']['city']}"
                ),
                "preview": (
                    f"{home_team['name']} face {away_team['name']} in CPL 2026 "
                    f"Match {number} at {fixture['venue']['name']}. The match is "
                    f"scheduled for {fixture['label']} at {fixture['time']} local time."
                ),
                "preview_detail": (
                    f"{home_team['summary']} {away_team['summary']} The final "
                    "playing XIs will be confirmed after the toss."
                ),
                "last_updated": LAST_UPDATED,
            }

        expected_slugs.add(record["slug"])
        destination = MATCH_DIR / f"{record['slug']}.json"
        destination.write_text(
            json.dumps(record, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    stale = sorted(path.stem for path in MATCH_DIR.glob("*.json") if path.stem not in expected_slugs)
    if stale:
        raise ValueError(f"Unexpected stale match records: {', '.join(stale)}")
    if len(expected_slugs) != 39:
        raise ValueError(f"Expected 39 unique matches, found {len(expected_slugs)}")
    print(f"Generated {len(expected_slugs)} match records")


if __name__ == "__main__":
    main()
