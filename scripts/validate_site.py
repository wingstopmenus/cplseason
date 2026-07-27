#!/usr/bin/env python3
"""Validate CPL Season entity references and generated internal links."""

from __future__ import annotations

import json
import re
import sys
from html import escape, unescape
from collections import deque
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_TEAM_COUNTS = {
    "antigua-barbuda-falcons": 18,
    "barbados-royals": 17,
    "guyana-amazon-warriors": 17,
    "jamaica-kingsmen": 19,
    "st-kitts-nevis-patriots": 17,
    "saint-lucia-kings": 17,
    "trinbago-knight-riders": 17,
}
HREF_RE = re.compile(r'<a\b[^>]*\bhref=["\']([^"\']+)["\']', re.IGNORECASE)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def route_for_html(path: Path) -> str:
    relative = path.relative_to(ROOT)
    if relative.name == "index.html":
        parent = relative.parent.as_posix()
        return "/" if parent == "." else f"/{parent}/"
    return f"/{relative.as_posix()}"


def local_target(href: str, source_route: str) -> str | None:
    parsed = urlparse(href)
    if parsed.scheme or parsed.netloc or href.startswith(("#", "mailto:", "tel:")):
        return None
    path = unquote(parsed.path)
    if not path:
        return source_route
    if not path.startswith("/"):
        base = source_route if source_route.endswith("/") else source_route.rsplit("/", 1)[0] + "/"
        parts = [part for part in (base + path).split("/") if part not in ("", ".")]
        resolved: list[str] = []
        for part in parts:
            if part == "..":
                if resolved:
                    resolved.pop()
            else:
                resolved.append(part)
        path = "/" + "/".join(resolved)
    if path != "/" and "." not in Path(path).name and not path.endswith("/"):
        path += "/"
    return path


def main() -> int:
    errors: list[str] = []
    player_files = sorted((ROOT / "data" / "players").glob("*.json"))
    team_files = sorted((ROOT / "data" / "teams").glob("*.json"))
    venue_files = sorted((ROOT / "data" / "venues").glob("*.json"))
    news_files = sorted((ROOT / "data" / "news").glob("*.json"))
    match_files = sorted((ROOT / "data" / "matches").glob("*.json"))
    players = {path.stem: load_json(path) for path in player_files}
    teams = {path.stem: load_json(path) for path in team_files}
    venues = {path.stem: load_json(path) for path in venue_files}
    news_articles = {path.stem: load_json(path) for path in news_files}
    matches = {path.stem: load_json(path) for path in match_files}

    if len(players) != 122:
        errors.append(f"Expected 122 player records, found {len(players)}")
    if len(teams) != 7:
        errors.append(f"Expected 7 team records, found {len(teams)}")
    if len(venues) != 8:
        errors.append(f"Expected 8 venue records, found {len(venues)}")
    if len(news_articles) < 13:
        errors.append(
            f"Expected at least 13 complete news records, found {len(news_articles)}"
        )
    if len(matches) != 39:
        errors.append(f"Expected 39 match records, found {len(matches)}")

    match_numbers: list[int] = []
    for slug, match in matches.items():
        if match.get("slug") != slug:
            errors.append(f"Match filename/slug mismatch: {slug}")
        for field in (
            "match_number",
            "competition",
            "stage",
            "home_team_label",
            "away_team_label",
            "venue_slug",
            "date",
            "start_time_local",
            "timezone",
            "start_iso",
            "status",
            "preview_heading",
            "preview",
            "preview_detail",
            "last_updated",
        ):
            if not match.get(field):
                errors.append(f"{slug}: missing match field {field}")
        match_number = match.get("match_number")
        if isinstance(match_number, int):
            match_numbers.append(match_number)
        if match.get("stage") == "League stage":
            if match.get("home_team_slug") not in teams:
                errors.append(
                    f"{slug}: unknown home team {match.get('home_team_slug')}"
                )
            if match.get("away_team_slug") not in teams:
                errors.append(
                    f"{slug}: unknown away team {match.get('away_team_slug')}"
                )
        elif match.get("home_team_slug") or match.get("away_team_slug"):
            errors.append(f"{slug}: unresolved playoff team must remain null")
        if match.get("venue_slug") not in venues:
            errors.append(f"{slug}: unknown venue {match.get('venue_slug')}")
        match_path = ROOT / "match" / slug / "index.html"
        if not match_path.is_file():
            errors.append(f"{slug}: missing canonical match page")
        else:
            match_html = match_path.read_text(encoding="utf-8")
            canonical = f"https://cplseason.com/match/{slug}/"
            if f'<link rel="canonical" href="{canonical}">' not in match_html:
                errors.append(f"{slug}: match page has the wrong canonical")
            if '"@type":"SportsEvent"' not in match_html:
                errors.append(f"{slug}: match page is missing SportsEvent schema")
            references = [f'/venue/{match.get("venue_slug")}/']
            if match.get("home_team_slug"):
                references.extend(
                    (
                        f'/team/{match.get("home_team_slug")}/',
                        f'/team/{match.get("away_team_slug")}/',
                    )
                )
            for reference in references:
                if f'href="{reference}"' not in match_html:
                    errors.append(f"{slug}: match page is missing link {reference}")
    if sorted(match_numbers) != list(range(1, 40)):
        errors.append("Match numbers must be unique and cover 1 through 39")

    for slug, article in news_articles.items():
        if article.get("slug") != slug:
            errors.append(f"News filename/slug mismatch: {slug}")
        for field in (
            "category",
            "title",
            "short_title",
            "description",
            "dek",
            "date_published",
            "date_modified",
            "image",
            "image_alt",
            "summary_heading",
            "key_points",
            "sections",
            "related_links",
            "source_name",
            "source_date",
            "last_updated",
        ):
            if not article.get(field):
                errors.append(f"{slug}: missing news field {field}")
        image_path = ROOT / str(article.get("image", "")).lstrip("/")
        if not image_path.is_file():
            errors.append(f"{slug}: missing news image {article.get('image')}")
        if len(article.get("key_points", [])) < 3:
            errors.append(f"{slug}: news story needs at least three key points")
        if len(article.get("sections", [])) < 3:
            errors.append(f"{slug}: news story needs at least three sections")
        body_words = sum(
            len(paragraph.split())
            for section in article.get("sections", [])
            for paragraph in section.get("paragraphs", [])
        )
        if body_words < 150:
            errors.append(
                f"{slug}: news story is too thin at {body_words} body words"
            )
        team_slug = article.get("team_slug")
        if team_slug and team_slug not in teams:
            errors.append(f"{slug}: unknown news team reference {team_slug}")
        for player_slug in article.get("player_slugs", []):
            if player_slug not in players:
                errors.append(
                    f"{slug}: unknown news player reference {player_slug}"
                )

    rostered: list[str] = []
    for slug, team in teams.items():
        if team.get("slug") != slug:
            errors.append(f"Team filename/slug mismatch: {slug}")
        expected_count = EXPECTED_TEAM_COUNTS.get(slug)
        if expected_count is None:
            errors.append(f"Unknown team slug: {slug}")
        elif len(team.get("roster", [])) != expected_count:
            errors.append(
                f"{slug}: expected {expected_count} roster names, "
                f"found {len(team.get('roster', []))}"
            )
        logo = ROOT / str(team.get("logo", "")).lstrip("/")
        if not logo.is_file():
            errors.append(f"{slug}: missing logo {team.get('logo')}")
        for field in (
            "short_name",
            "territory",
            "city",
            "venue_slug",
            "schedule_names",
            "league_fixtures",
            "home_matches",
            "status_label",
            "summary",
            "storyline",
            "external_ids",
            "last_updated",
        ):
            if not team.get(field):
                errors.append(f"{slug}: missing team directory field {field}")
        for field in (
            "founded",
            "identity",
            "honours",
            "profile_lede",
            "history",
            "profile_highlights",
        ):
            if not team.get(field):
                errors.append(f"{slug}: missing team profile field {field}")
        if not isinstance(team.get("title_count"), int):
            errors.append(f"{slug}: title_count must be an integer")
        if not isinstance(team.get("title_years"), list):
            errors.append(f"{slug}: title_years must be a list")
        elif team.get("title_count") != len(team["title_years"]):
            errors.append(f"{slug}: title_count does not match title_years")
        if len(team.get("history", [])) < 3:
            errors.append(f"{slug}: team history must contain three paragraphs")
        if len(team.get("profile_highlights", [])) != 3:
            errors.append(f"{slug}: team profile must contain three highlights")
        if team.get("venue_slug") not in venues:
            errors.append(f"{slug}: unresolved home venue {team.get('venue_slug')}")
        if team.get("league_fixtures") != 10:
            errors.append(
                f"{slug}: expected 10 league fixtures, "
                f"found {team.get('league_fixtures')}"
            )
        for player_slug in team.get("roster", []):
            rostered.append(player_slug)
            player = players.get(player_slug)
            if not player:
                errors.append(f"{slug}: unresolved player {player_slug}")
                continue
            if player.get("team_slug") != slug:
                errors.append(f"{player_slug}: team reference does not match {slug}")

    if len(rostered) != len(set(rostered)):
        errors.append("A player appears in more than one roster")
    missing_from_rosters = sorted(set(players) - set(rostered))
    if missing_from_rosters:
        errors.append(f"Players missing from team rosters: {', '.join(missing_from_rosters)}")

    for slug, player in players.items():
        if player.get("slug") != slug:
            errors.append(f"Player filename/slug mismatch: {slug}")
        if player.get("team_slug") not in teams:
            errors.append(f"{slug}: unresolved team {player.get('team_slug')}")
        if not (ROOT / "player" / slug / "index.html").is_file():
            errors.append(f"{slug}: missing canonical player page")
        image = player.get("image")
        if image and not (ROOT / image.lstrip("/")).is_file():
            errors.append(f"{slug}: missing image asset {image}")
        profile_path = ROOT / "player" / slug / "index.html"
        if profile_path.is_file():
            profile = profile_path.read_text(encoding="utf-8")
            expected_canonical = f"https://cplseason.com/player/{slug}/"
            if 'class="profile-stage"' not in profile:
                errors.append(f"{slug}: player profile was not rendered from the shared template")
            if f'<link rel="canonical" href="{expected_canonical}">' not in profile:
                errors.append(f"{slug}: player profile has the wrong canonical")
            if f'href="/team/{player["team_slug"]}/"' not in profile:
                errors.append(f"{slug}: player profile does not link its team")
            if 'href="/players/"' not in profile or 'href="/squads/' not in profile:
                errors.append(f"{slug}: player profile is missing directory links")
            if '"@type":"Person"' not in profile or '"sport":"Cricket"' not in profile:
                errors.append(f"{slug}: player profile is missing Person cricket schema")

    for slug, venue in venues.items():
        if venue.get("slug") != slug:
            errors.append(f"Venue filename/slug mismatch: {slug}")
        if not (ROOT / "venue" / slug / "index.html").is_file():
            errors.append(f"{slug}: missing canonical venue page")
        image = venue.get("image")
        if not image or not (ROOT / image.lstrip("/")).is_file():
            errors.append(f"{slug}: missing venue image asset {image}")
        for field in (
            "name",
            "city",
            "territory",
            "capacity",
            "matches",
            "date_window",
            "image_source",
            "image_credit",
            "image_license",
            "image_license_url",
            "external_ids",
            "last_updated",
        ):
            if not venue.get(field):
                errors.append(f"{slug}: missing required venue field {field}")
        for field in (
            "tagline",
            "established",
            "ends",
            "home_team",
            "story",
            "highlights",
            "visitor_note",
            "fixtures",
        ):
            if not venue.get(field):
                errors.append(f"{slug}: missing venue profile field {field}")
        if len(venue.get("story", [])) < 3:
            errors.append(f"{slug}: venue story must contain at least three paragraphs")
        if len(venue.get("highlights", [])) != 3:
            errors.append(f"{slug}: venue profile must contain three highlights")
        if len(venue.get("fixtures", [])) != venue.get("matches"):
            errors.append(
                f"{slug}: fixture list has {len(venue.get('fixtures', []))} "
                f"entries, expected {venue.get('matches')}"
            )
        profile_path = ROOT / "venue" / slug / "index.html"
        if profile_path.is_file():
            profile = profile_path.read_text(encoding="utf-8")
            expected_canonical = f"https://cplseason.com/venue/{slug}/"
            if 'class="venue-profile-stage"' not in profile:
                errors.append(f"{slug}: venue profile was not rendered from the shared template")
            if f'<link rel="canonical" href="{expected_canonical}">' not in profile:
                errors.append(f"{slug}: venue profile has the wrong canonical")
            if profile.count('class="venue-fixture-list"') != 1:
                errors.append(f"{slug}: venue profile is missing its fixture list")
            for fixture in venue.get("fixtures", []):
                if escape(str(fixture.get("match"))) not in profile:
                    errors.append(
                        f"{slug}: venue profile is missing fixture {fixture.get('match')}"
                    )
            if '"@type":"StadiumOrArena"' not in profile:
                errors.append(f"{slug}: venue profile is missing StadiumOrArena schema")

    generated = (ROOT / "squads" / "index.html").read_text(encoding="utf-8")
    card_count = generated.count("data-squad-player")
    if card_count != 122:
        errors.append(f"Generated squads page has {card_count} player cards, expected 122")
    for slug in players:
        if f'href="/player/{slug}/"' not in generated:
            errors.append(f"Generated squads page does not link player {slug}")
    for slug in teams:
        if f'id="{slug}"' not in generated:
            errors.append(f"Generated squads page is missing team section {slug}")

    players_page = (ROOT / "players" / "index.html").read_text(encoding="utf-8")
    directory_card_count = players_page.count("data-directory-player")
    if directory_card_count != 122:
        errors.append(
            f"Generated players page has {directory_card_count} player cards, "
            "expected 122"
        )
    for slug in players:
        if f'href="/player/{slug}/"' not in players_page:
            errors.append(f"Generated players page does not link player {slug}")
    for slug in teams:
        if f'data-player-team-section="{slug}"' not in players_page:
            errors.append(f"Generated players page is missing team section {slug}")

    teams_page = (ROOT / "teams" / "index.html").read_text(encoding="utf-8")
    if 'class="teams-atlas"' not in teams_page:
        errors.append("Generated teams page was not rendered from the shared template")
    team_card_count = teams_page.count("data-team-card")
    if team_card_count != 7:
        errors.append(
            f"Generated teams page has {team_card_count} team cards, expected 7"
        )
    if teams_page.count('"@type":"SportsTeam"') != 7:
        errors.append("Generated teams page does not contain seven SportsTeam entities")
    for slug, team in teams.items():
        if f'id="{slug}"' not in teams_page:
            errors.append(f"Generated teams page is missing card {slug}")
        if f'href="/team/{slug}/"' not in teams_page:
            errors.append(f"Generated teams page does not link team {slug}")
        if f'href="/squads/#{slug}"' not in teams_page:
            errors.append(f"Generated teams page does not link squad {slug}")
        if f'href="/venue/{team.get("venue_slug")}/"' not in teams_page:
            errors.append(
                f"Generated teams page does not link {slug} home venue"
            )
        if str(team.get("summary")) not in unescape(teams_page):
            errors.append(f"Generated teams page is missing {slug} summary")
        profile_path = ROOT / "team" / slug / "index.html"
        if not profile_path.is_file():
            errors.append(f"{slug}: missing canonical team profile")
            continue
        profile = profile_path.read_text(encoding="utf-8")
        expected_canonical = f"https://cplseason.com/team/{slug}/"
        if 'class="team-profile-stage"' not in profile:
            errors.append(
                f"{slug}: team profile was not rendered from the shared template"
            )
        if f'<link rel="canonical" href="{expected_canonical}">' not in profile:
            errors.append(f"{slug}: team profile has the wrong canonical")
        profile_player_count = profile.count("data-team-player")
        if profile_player_count != len(team["roster"]):
            errors.append(
                f"{slug}: profile has {profile_player_count} player cards, "
                f"expected {len(team['roster'])}"
            )
        if profile.count("data-team-fixture") != team["league_fixtures"]:
            errors.append(f"{slug}: profile does not contain 10 league fixtures")
        for player_slug in team["roster"]:
            if f'href="/player/{player_slug}/"' not in profile:
                errors.append(
                    f"{slug}: team profile does not link player {player_slug}"
                )
        if f'href="/venue/{team["venue_slug"]}/"' not in profile:
            errors.append(f"{slug}: team profile does not link its home venue")
        if '"@type":"SportsTeam"' not in profile:
            errors.append(f"{slug}: team profile is missing SportsTeam schema")

    points_page = (ROOT / "points-table" / "index.html").read_text(
        encoding="utf-8"
    )
    if 'class="standings-control"' not in points_page:
        errors.append(
            "Generated points table was not rendered from the shared template"
        )
    if points_page.count("data-standings-team") != 7:
        errors.append("Generated points table does not contain seven team rows")
    if "data-live-standings" not in points_page:
        errors.append("Generated points table is missing live standings configuration")
    if 'src="/static/js/standings.js?' not in points_page:
        errors.append("Generated points table is missing the automatic standings script")
    if (
        '<link rel="canonical" '
        'href="https://cplseason.com/points-table/">' not in points_page
    ):
        errors.append("Generated points table has the wrong canonical")
    for slug, team in teams.items():
        if f'href="/team/{slug}/"' not in points_page:
            errors.append(f"Generated points table does not link team {slug}")
        if team["logo"] not in points_page:
            errors.append(f"Generated points table does not use logo for {slug}")
        official_team_id = team.get("external_ids", {}).get("mcpro_team_id")
        if not official_team_id:
            errors.append(f"{slug}: missing MCPRO team ID for live standings")
        elif f'data-official-team-id="{official_team_id}"' not in points_page:
            errors.append(f"Generated points table does not map MCPRO team {slug}")
    if points_page.count('"played":0') != 0:
        errors.append("Points table schema must not invent live numeric standings")
    if '"@type":"FAQPage"' not in points_page:
        errors.append("Generated points table is missing FAQ schema")

    schedule_page = (ROOT / "schedule" / "index.html").read_text(
        encoding="utf-8"
    )
    if schedule_page.count('class="schedule-match-centre-cta"') != 39:
        errors.append("Schedule page must contain 39 match centre links")
    for slug in matches:
        if f'href="/match/{slug}/"' not in schedule_page:
            errors.append(f"Schedule page does not link match {slug}")


    broadcast_data_path = ROOT / "data" / "broadcast-guide.json"
    if not broadcast_data_path.is_file():
        errors.append("Missing data/broadcast-guide.json")
        broadcast_guide = {}
    else:
        broadcast_guide = load_json(broadcast_data_path)
    for field in (
        "slug",
        "title",
        "description",
        "canonical",
        "headline",
        "lede",
        "hero_checked_label",
        "checked_label",
        "status",
        "steps",
        "time_conversions",
        "faq",
        "last_updated",
    ):
        if not broadcast_guide.get(field):
            errors.append(f"Broadcast guide is missing {field}")
    if len(broadcast_guide.get("status", [])) != 8:
        errors.append("Broadcast guide must contain eight regional statuses")
    confirmed_regions = [
        item for item in broadcast_guide.get("status", [])
        if item.get("status") == "Confirmed"
    ]
    if len(confirmed_regions) != 3:
        errors.append(
            "Broadcast guide must contain the three verified Caribbean, "
            "United States and Canada routes"
        )
    watch_page = (ROOT / "watch-live" / "index.html").read_text(
        encoding="utf-8"
    )
    if 'class="broadcast-guide"' not in watch_page:
        errors.append("Watch Live page was not rendered from the shared template")
    if watch_page.count("data-broadcast-region") != 8:
        errors.append("Watch Live page does not contain eight regional cards")
    if watch_page.count("data-broadcast-fixture") != 5:
        errors.append("Watch Live page does not contain five opening fixtures")
    if watch_page.count('class="broadcast-match-centre-link"') != 5:
        errors.append("Watch Live opening fixtures must contain five match-centre buttons")
    opening_matches = sorted(
        (
            match
            for match in matches.values()
            if match["stage"] == "League stage"
        ),
        key=lambda match: match["match_number"],
    )[:5]
    for match in opening_matches:
        if f'href="/match/{match["slug"]}/"' not in watch_page:
            errors.append(
                f"Watch Live opening fixtures do not link Match {match['match_number']}"
            )
    if watch_page.count("data-time-row") != 8:
        errors.append("Watch Live page does not contain eight time conversions")
    if (
        '<link rel="canonical" href="https://cplseason.com/watch-live/">'
        not in watch_page
    ):
        errors.append("Watch Live page has the wrong canonical")
    if '"@type":"WebPage"' not in watch_page:
        errors.append("Watch Live page is missing WebPage schema")
    if '"@type":"FAQPage"' not in watch_page:
        errors.append("Watch Live page is missing FAQ schema")
    if watch_page.count("<h1") != 1:
        errors.append("Watch Live page must contain exactly one H1")
    if (
        "<h1 id=\"broadcast-title\">"
        "CPL 2026 live streaming and TV channels</h1>"
        not in watch_page
    ):
        errors.append("Watch Live page H1 is not aligned with its search intent")
    if not 45 <= len(broadcast_guide.get("title", "")) <= 60:
        errors.append("Watch Live SEO title must be 45 to 60 characters")
    if not 140 <= len(broadcast_guide.get("description", "")) <= 160:
        errors.append("Watch Live meta description must be 140 to 160 characters")
    for unsupported_claim in (
        "Star Sports",
        "FanCode",
        "TNT Sports",
        "Kayo Sports",
        "Tapmad",
    ):
        if unsupported_claim in watch_page:
            errors.append(
                f"Watch Live page contains unverified 2026 claim: "
                f"{unsupported_claim}"
            )

    venues_page = (ROOT / "venues" / "index.html").read_text(encoding="utf-8")
    venue_card_count = venues_page.count("data-venue-card")
    if venue_card_count != 8:
        errors.append(
            f"Generated venues page has {venue_card_count} venue cards, expected 8"
        )
    for slug, venue in venues.items():
        if f'href="/venue/{slug}/"' not in venues_page:
            errors.append(f"Generated venues page does not link venue {slug}")
        if venue["image"] not in venues_page:
            errors.append(f"Generated venues page does not use image for {slug}")
    if venues_page.count('"@type":"Place"') != 8:
        errors.append("Generated venues page does not contain eight Place entities")

    news_page = (ROOT / "news" / "index.html").read_text(encoding="utf-8")
    if '"@type":"CollectionPage"' not in news_page:
        errors.append("News index is missing CollectionPage schema")
    for slug in news_articles:
        route = ROOT / "news" / slug / "index.html"
        if not route.is_file():
            errors.append(f"{slug}: missing generated news article")
            continue
        if f'href="/news/{slug}/"' not in news_page:
            errors.append(f"News index does not link article {slug}")
        content = route.read_text(encoding="utf-8")
        if content.count("<h1") != 1:
            errors.append(f"{slug}: news article must contain exactly one H1")
        if '"@type":"NewsArticle"' not in content:
            errors.append(f"{slug}: missing NewsArticle schema")
        if 'href="/news/"' not in content:
            errors.append(f"{slug}: news article does not link back to news")

    html_files = sorted(
        path for path in ROOT.rglob("*.html")
        if not any(part in {".git", "templates"} for part in path.parts)
    )
    route_map = {route_for_html(path): path for path in html_files}
    asset_routes = {
        f"/{path.relative_to(ROOT).as_posix()}"
        for path in ROOT.rglob("*")
        if path.is_file()
    }
    graph: dict[str, set[str]] = {route: set() for route in route_map}
    for route, path in route_map.items():
        content = path.read_text(encoding="utf-8", errors="replace")
        for href in HREF_RE.findall(content):
            parsed_href = urlparse(href)
            if (
                parsed_href.scheme in {"http", "https"}
                and parsed_href.netloc.lower()
                not in {"cplseason.com", "www.cplseason.com"}
            ):
                errors.append(f"{route} -> external link {href}")
                continue
            target = local_target(href, route)
            if target is None:
                continue
            if target in route_map:
                graph[route].add(target)
            elif target not in asset_routes:
                errors.append(f"{route} -> broken link {href}")

    reached: set[str] = set()
    queue = deque(["/"])
    while queue:
        route = queue.popleft()
        if route in reached or route not in graph:
            continue
        reached.add(route)
        queue.extend(graph[route] - reached)
    orphan_routes = sorted(set(route_map) - reached - {"/404.html"})
    if orphan_routes:
        errors.append(f"Orphan pages: {', '.join(orphan_routes)}")

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(
        f"Validation passed: {len(players)} players, {len(teams)} teams, "
        f"{len(venues)} venues, "
        f"{len(route_map)} HTML pages, no broken links or orphans"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
