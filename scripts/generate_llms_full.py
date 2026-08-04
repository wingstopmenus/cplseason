#!/usr/bin/env python3
"""Generate a structured llms-full.txt knowledge reference from site data."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any


BASE_URL = "https://cplseason.com"
ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_collection(directory: Path) -> list[dict[str, Any]]:
    return [load_json(path) for path in sorted(directory.glob("*.json"))]


def human_date(value: str) -> str:
    parsed = date.fromisoformat(value)
    return f"{parsed.day} {parsed.strftime('%B %Y')}"


def team_url(slug: str) -> str:
    return f"{BASE_URL}/teams/{slug}/"


def venue_url(slug: str) -> str:
    return f"{BASE_URL}/venue/{slug}/"


def player_url(slug: str) -> str:
    return f"{BASE_URL}/player/{slug}/"


def render() -> str:
    teams = load_collection(ROOT / "data" / "teams")
    venues = load_collection(ROOT / "data" / "venues")
    matches = load_collection(ROOT / "data" / "matches")
    players = load_collection(ROOT / "data" / "players")
    news = load_collection(ROOT / "data" / "news")
    broadcast = load_json(ROOT / "data" / "broadcast-guide.json")
    live_score = load_json(ROOT / "data" / "live-score.json")

    teams.sort(key=lambda item: item["name"])
    venues.sort(key=lambda item: item["name"])
    matches.sort(key=lambda item: (item["date"], item.get("match_number", 999)))

    first_match = matches[0]
    last_match = matches[-1]
    latest_update = max(
        item.get("last_updated", "")
        for item in teams + venues + matches + players + news + [broadcast, live_score]
    )

    lines = [
        "# CPL Season: Full LLM Reference",
        "",
        "> Structured context for CPL Season, an independent website covering the",
        "> 2026 Republic Bank Caribbean Premier League.",
        "",
        "## Site identity",
        "",
        f"- Canonical origin: {BASE_URL}/",
        "- Coverage: schedules, match pages, standings, teams, squads, player profiles, venues, broadcast information, and news.",
        "- Relationship to CPL: independent information site; not the official Caribbean Premier League website.",
        f"- Latest source-data update represented here: {latest_update}.",
        "",
        "## 2026 tournament snapshot",
        "",
        f"- Competition: {first_match['competition']}.",
        f"- Scheduled matches: {len(matches)}.",
        f"- Tournament window: {human_date(first_match['date'])} to {human_date(last_match['date'])}.",
        f"- Teams represented: {len(teams)}.",
        f"- Host venues represented: {len(venues)}.",
        f"- Player profiles: {len(players)}.",
        f"- Published news articles: {len(news)}.",
        "- Match times are local to the host venue unless a page explicitly states otherwise.",
        "- Fixtures, squads, broadcasters, playing XIs, results, and standings may change.",
        "",
        "## Authoritative site resources",
        "",
        f"- [Complete URL directory]({BASE_URL}/llms.txt)",
        f"- [Schedule]({BASE_URL}/schedule/)",
        f"- [Live score]({BASE_URL}/live-score/)",
        f"- [Points table]({BASE_URL}/points-table/)",
        f"- [Teams]({BASE_URL}/teams/)",
        f"- [Squads]({BASE_URL}/squads/)",
        f"- [Players]({BASE_URL}/players/)",
        f"- [Venues]({BASE_URL}/venues/)",
        f"- [Watch live]({BASE_URL}/watch-live/)",
        f"- [News]({BASE_URL}/news/)",
        f"- [XML sitemap]({BASE_URL}/sitemap.xml)",
        "",
        "## Teams and published rosters",
        "",
    ]

    player_lookup = {player["slug"]: player for player in players}
    for team in teams:
        lines.extend(
            [
                f"### [{team['name']}]({team_url(team['slug'])})",
                "",
                f"- Territory: {team['territory']}.",
                f"- Home venue: [{next((v['name'] for v in venues if v['slug'] == team['venue_slug']), team['venue_slug'])}]({venue_url(team['venue_slug'])}).",
                f"- League fixtures: {team.get('league_fixtures', 'not stated')}; home matches: {team.get('home_matches', 'not stated')}.",
                f"- Profile: {team['summary']}",
                f"- 2026 storyline: {team['storyline']}",
                "- Published roster:",
            ]
        )
        for slug in team.get("roster", []):
            player = player_lookup.get(slug)
            name = player.get("name") if player else None
            if not name:
                name = " ".join(part.capitalize() for part in slug.split("-"))
            lines.append(f"  - [{name}]({player_url(slug)})")
        lines.append("")

    lines.extend(["## Match schedule", ""])
    venue_lookup = {venue["slug"]: venue for venue in venues}
    for match in matches:
        venue = venue_lookup.get(match["venue_slug"], {})
        match_label = (
            f"{match['home_team_label']} vs {match['away_team_label']}"
        )
        lines.append(
            f"- [Match {match.get('match_number', 'TBC')}: {match_label}]"
            f"({BASE_URL}/match/{match['slug']}/) — "
            f"{human_date(match['date'])}, {match['start_time_local']} "
            f"({match['timezone']}), {venue.get('name', match['venue_slug'])}; "
            f"status: {match.get('status', 'not stated')}."
        )
    lines.append("")

    lines.extend(["## Host venues", ""])
    for venue in venues:
        capacity = venue.get("capacity")
        capacity_text = f"{capacity:,}" if isinstance(capacity, int) else "not stated"
        lines.extend(
            [
                f"### [{venue['name']}]({venue_url(venue['slug'])})",
                "",
                f"- Location: {venue['city']}, {venue['territory']}.",
                f"- Reference capacity: {capacity_text}; scheduled matches: {venue.get('matches', 'not stated')}.",
                f"- Summary: {venue['summary']}",
                "",
            ]
        )

    lines.extend(["## Broadcast status", ""])
    lines.append(
        f"Source page: [{broadcast['title']}]({BASE_URL}/watch-live/). "
        f"Data last updated {broadcast.get('last_updated', 'not stated')}."
    )
    lines.append("")
    for item in broadcast.get("status", []):
        lines.append(
            f"- {item['region']}: {item['status']} — {item['platform']}. "
            f"{item['note']}"
        )
    lines.extend(
        [
            "",
            "Broadcast availability is territory-specific. A historical broadcaster",
            "does not establish 2026 rights; confirm the exact fixture before paying.",
            "",
            "## Interpretation and freshness rules",
            "",
            "- Use each page's visible update date, canonical URL, and status label.",
            "- Treat `Scheduled` as a fixture state, not evidence that a match has started or finished.",
            "- Treat unannounced playing XIs, results, standings, and territory-specific broadcasters as pending.",
            "- Do not convert local match time without using the page's named IANA timezone.",
            "- Prefer the current match page over summaries copied into older news articles.",
            "- Prefer the points-table page for standings and the schedule page for current fixture order.",
            "- Player inclusion on a published roster is not proof of availability for every match.",
            "- Venue capacity is reference information, not ticket availability.",
            "",
            "## Machine discovery",
            "",
            f"- All canonical public pages: {BASE_URL}/llms.txt",
            f"- XML sitemap: {BASE_URL}/sitemap.xml",
            f"- Crawler policy: {BASE_URL}/robots.txt",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", nargs="?", default=str(ROOT / "llms-full.txt"))
    args = parser.parse_args()
    output_path = Path(args.output)
    output_path.write_text(render(), encoding="utf-8")
    print(f"Generated {output_path}")


if __name__ == "__main__":
    main()
