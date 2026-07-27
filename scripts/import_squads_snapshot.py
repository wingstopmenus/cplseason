#!/usr/bin/env python3
"""One-time migration of the recovered squads HTML into entity JSON files."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "squads" / "index.html"
TEAM_DIR = ROOT / "data" / "teams"
PLAYER_DIR = ROOT / "data" / "players"
UPDATED = "2026-07-26"
TEAM_RE = re.compile(
    r'<article class="squad-team-block">\s*'
    r'<h3><a href="/team/(?P<slug>[^/]+)/">(?P<name>.*?)</a></h3>\s*'
    r'<div class="squad-grid compact">(?P<cards>.*?)</div>\s*</article>',
    re.DOTALL,
)
CARD_RE = re.compile(
    r'<article class="squad-player-card">(?P<body>.*?)</article>',
    re.DOTALL,
)


def text(pattern: str, value: str) -> str:
    match = re.search(pattern, value, re.DOTALL)
    if not match:
        raise ValueError(f"Pattern not found: {pattern}")
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip()


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    TEAM_DIR.mkdir(parents=True, exist_ok=True)
    PLAYER_DIR.mkdir(parents=True, exist_ok=True)
    total = 0

    for team_match in TEAM_RE.finditer(source):
        team_slug = team_match.group("slug")
        team_name = html.unescape(team_match.group("name"))
        roster = []

        for card_match in CARD_RE.finditer(team_match.group("cards")):
            body = card_match.group("body")
            player_link = re.search(
                r'<h4><a href="/player/(?P<slug>[^/]+)/">(?P<name>.*?)</a></h4>',
                body,
                re.DOTALL,
            )
            if not player_link:
                raise ValueError(f"Player link missing in {team_name}")

            slug = player_link.group("slug")
            name = html.unescape(player_link.group("name"))
            category = text(r"<p>(.*?)</p>", body)
            note = text(r"<small>(.*?)</small>", body)
            image_match = re.search(r'<img[^>]+src="([^"]+)"', body)
            image = image_match.group(1) if image_match else None
            initials_match = re.search(
                r'<span class="player-initials"[^>]*>(.*?)</span>', body
            )
            initials = (
                html.unescape(initials_match.group(1)).strip()
                if initials_match
                else "".join(part[0] for part in name.split()[:2]).upper()
            )

            player = {
                "slug": slug,
                "name": name,
                "team_slug": team_slug,
                "category": category,
                "selection_note": note,
                "image": image,
                "initials": initials,
                "external_ids": {"wikipedia": None, "cpl": None},
                "last_updated": UPDATED,
            }
            (PLAYER_DIR / f"{slug}.json").write_text(
                json.dumps(player, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            roster.append(slug)
            total += 1

        team = {
            "slug": team_slug,
            "name": team_name,
            "logo": f"/static/img/official/teams/{team_slug}.png",
            "roster": roster,
            "external_ids": {"wikipedia": None, "cpl": None},
            "last_updated": UPDATED,
        }
        (TEAM_DIR / f"{team_slug}.json").write_text(
            json.dumps(team, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    if total != 122:
        raise SystemExit(f"Expected 122 players, extracted {total}")
    print(f"Imported 7 teams and {total} players")


if __name__ == "__main__":
    main()
