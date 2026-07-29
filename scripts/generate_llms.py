#!/usr/bin/env python3
"""Generate llms.txt from every canonical URL in sitemap.xml."""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET


CATEGORY_ORDER = [
    "",
    "schedule",
    "points-table",
    "teams",
    "team",
    "squads",
    "players",
    "player",
    "matches",
    "match",
    "venues",
    "venue",
    "news",
    "watch-live",
]

CATEGORY_TITLES = {
    "": "Homepage",
    "schedule": "Schedule",
    "points-table": "Points Table",
    "teams": "Teams Directory",
    "team": "Team Pages",
    "squads": "Squads",
    "players": "Players Directory",
    "player": "Player Profiles",
    "matches": "Matches Directory",
    "match": "Match Pages",
    "venues": "Venues Directory",
    "venue": "Venue Pages",
    "news": "News",
    "watch-live": "Watch Live",
}

SPECIAL_WORDS = {
    "cpl": "CPL",
    "tkr": "TKR",
    "vs": "vs",
}


def title_from_url(url: str) -> str:
    parts = [part for part in urlparse(url).path.split("/") if part]
    if not parts:
        return "CPL Season Homepage"

    slug = parts[-1]
    words = [
        SPECIAL_WORDS.get(word.lower(), word.capitalize())
        for word in slug.split("-")
    ]
    return " ".join(words)


def read_urls(sitemap_path: Path) -> list[str]:
    root = ET.parse(sitemap_path).getroot()
    urls = []
    for element in root.iter():
        if element.tag.endswith("loc") and element.text:
            urls.append(element.text.strip())
    return urls


def render(urls: list[str]) -> str:
    grouped: dict[str, list[str]] = defaultdict(list)
    for url in urls:
        parts = [part for part in urlparse(url).path.split("/") if part]
        grouped[parts[0] if parts else ""].append(url)

    lines = [
        "# CPL Season",
        "",
        "> Complete canonical URL directory for CPL Season, an independent",
        "> Caribbean Premier League coverage site focused on the 2026 season.",
        "",
        f"This file lists all {len(urls)} public URLs from https://cplseason.com/sitemap.xml.",
        "For changing information such as fixtures, match times, and standings, use the",
        "latest content on the linked page.",
        "",
    ]

    ordered_categories = CATEGORY_ORDER + sorted(
        category for category in grouped if category not in CATEGORY_ORDER
    )
    for category in ordered_categories:
        category_urls = grouped.get(category)
        if not category_urls:
            continue
        lines.append(f"## {CATEGORY_TITLES.get(category, category.replace('-', ' ').title())}")
        lines.append("")
        for url in category_urls:
            lines.append(f"- [{title_from_url(url)}]({url})")
        lines.append("")

    lines.extend(
        [
            "## Discovery",
            "",
            "- [XML Sitemap](https://cplseason.com/sitemap.xml)",
            "- [Extended LLM Guide](https://cplseason.com/llms-full.txt)",
            "- [Robots Policy](https://cplseason.com/robots.txt)",
            "",
            "CPL Season is an independent information site and is not the official",
            "Caribbean Premier League website.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sitemap", nargs="?", default="sitemap.xml")
    parser.add_argument("output", nargs="?", default="llms.txt")
    args = parser.parse_args()

    sitemap_path = Path(args.sitemap)
    output_path = Path(args.output)
    urls = read_urls(sitemap_path)
    output_path.write_text(render(urls), encoding="utf-8", newline="\n")
    print(f"Generated {output_path} with {len(urls)} sitemap URLs")


if __name__ == "__main__":
    main()
