#!/usr/bin/env python3
"""Generate sitemap.xml from canonical, indexable HTML routes."""

from __future__ import annotations

import re
from pathlib import Path
from xml.etree.ElementTree import Element, ElementTree, SubElement, indent

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://cplseason.com"
CORE_ROUTES = {
    "/",
    "/cpl-history/",
    "/cpl-2026-live-streaming/",
    "/cpl-winners-list/",
    "/live-score/",
    "/most-successful-cpl-teams/",
    "/news/",
    "/players/",
    "/points-table/",
    "/schedule/",
    "/squads/",
    "/venues/",
    "/watch-live/",
}
CONTENT_PREFIXES = (
    "/match/",
    "/news/",
    "/player/",
    "/teams/",
    "/venue/",
)
CANONICAL_RE = re.compile(
    r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
ROBOTS_RE = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
MODIFIED_RE = re.compile(
    r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})'
    r'|article:modified_time["\']\s+content=["\'](\d{4}-\d{2}-\d{2})',
    re.IGNORECASE,
)


def route_for(path: Path) -> str:
    relative = path.relative_to(ROOT)
    if relative.name == "index.html":
        parent = relative.parent.as_posix()
        return "/" if parent == "." else f"/{parent}/"
    return f"/{relative.as_posix()}"


def should_include(route: str) -> bool:
    """Include only canonical pages that are useful as search results."""
    return route in CORE_ROUTES or route.startswith(CONTENT_PREFIXES)


def page_metadata(route: str, path: Path) -> tuple[str, str]:
    """Return the verified canonical and the page's own meaningful modified date."""
    content = path.read_text(encoding="utf-8")
    expected_canonical = f"{BASE_URL}{route}"
    canonicals = CANONICAL_RE.findall(content)
    if canonicals != [expected_canonical]:
        raise ValueError(
            f"{path.relative_to(ROOT)} must have one self-referencing canonical "
            f"({expected_canonical}); found {canonicals or 'none'}"
        )

    robots = ROBOTS_RE.findall(content)
    if not robots:
        raise ValueError(f"{path.relative_to(ROOT)} is missing a robots meta tag")
    if any("noindex" in value.lower() for value in robots):
        raise ValueError(
            f"{path.relative_to(ROOT)} is noindex and cannot enter the sitemap"
        )

    modified_dates = {
        date
        for match in MODIFIED_RE.findall(content)
        for date in match
        if date
    }
    if not modified_dates:
        raise ValueError(
            f"{path.relative_to(ROOT)} has no trustworthy dateModified value"
        )
    return expected_canonical, max(modified_dates)


def main() -> None:
    pages = sorted(
        (
            (route_for(path), path)
            for path in ROOT.rglob("*.html")
            if not any(part in {".git", "templates"} for part in path.parts)
            and path.name != "404.html"
            and should_include(route_for(path))
        ),
        key=lambda item: (item[0] != "/", item[0]),
    )
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    urlset = Element("urlset", xmlns=namespace)
    for route, path in pages:
        canonical, modified = page_metadata(route, path)
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = canonical
        SubElement(url, "lastmod").text = modified
    indent(urlset, space="  ")
    ElementTree(urlset).write(
        ROOT / "sitemap.xml",
        encoding="utf-8",
        xml_declaration=True,
    )
    print(f"Generated sitemap.xml with {len(pages)} recommended URLs")


if __name__ == "__main__":
    main()
