#!/usr/bin/env python3
"""Generate sitemap.xml from canonical, indexable HTML routes."""

from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path
from xml.etree.ElementTree import Element, ElementTree, SubElement, indent

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://cplseason.com"
CORE_ROUTES = {
    "/",
    "/authors/",
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
    "/teams/",
    "/venues/",
    "/watch-live/",
}
CONTENT_PREFIXES = (
    "/authors/",
    "/match/",
    "/match-preview/",
    "/news/",
    "/player/",
    "/team/",
    "/venue/",
)
MODIFIED_RE = re.compile(
    r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})'
    r'|article:modified_time["\']\s+content=["\'](\d{4}-\d{2}-\d{2})',
    re.IGNORECASE,
)


class SeoTagParser(HTMLParser):
    """Collect SEO tags without assuming any particular attribute order."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.canonicals: list[str] = []
        self.robots: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {name.lower(): value or "" for name, value in attrs}
        if tag.lower() == "link":
            rel_tokens = values.get("rel", "").lower().split()
            if "canonical" in rel_tokens and values.get("href"):
                self.canonicals.append(values["href"])
        elif (
            tag.lower() == "meta"
            and values.get("name", "").lower() == "robots"
            and values.get("content")
        ):
            self.robots.append(values["content"])


def route_for(path: Path) -> str:
    relative = path.relative_to(ROOT)
    if relative.name == "index.html":
        parent = relative.parent.as_posix()
        return "/" if parent == "." else f"/{parent}/"
    return f"/{relative.as_posix()}"


def should_include(route: str) -> bool:
    """Include only canonical pages that are useful as search results."""
    return route in CORE_ROUTES or route.startswith(CONTENT_PREFIXES)


def page_metadata(route: str, path: Path) -> tuple[str, str | None]:
    """Return the verified canonical and an optional trustworthy modified date."""
    content = path.read_text(encoding="utf-8")
    expected_canonical = f"{BASE_URL}{route}"
    parser = SeoTagParser()
    parser.feed(content)
    canonicals = parser.canonicals
    if canonicals != [expected_canonical]:
        raise ValueError(
            f"{path.relative_to(ROOT)} must have one self-referencing canonical "
            f"({expected_canonical}); found {canonicals or 'none'}"
        )

    robots = parser.robots
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
    return expected_canonical, max(modified_dates) if modified_dates else None


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
        # Google recommends lastmod only when it reflects a meaningful page
        # update. Omit the optional tag rather than publishing a guessed date.
        if modified:
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
