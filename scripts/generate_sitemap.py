#!/usr/bin/env python3
"""Generate sitemap.xml from canonical, search-focused HTML routes."""

from __future__ import annotations

from pathlib import Path
from subprocess import CalledProcessError, check_output
from xml.etree.ElementTree import Element, ElementTree, SubElement, indent

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://cplseason.com"
CORE_ROUTES = {
    "/",
    "/live-score/",
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
    "/match/",
    "/news/",
    "/player/",
    "/team/",
    "/venue/",
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


def last_modified(path: Path) -> str:
    """Use the page's latest Git commit date instead of an artificial build date."""
    relative = path.relative_to(ROOT).as_posix()
    try:
        return check_output(
            ["git", "log", "-1", "--format=%cs", "--", relative],
            cwd=ROOT,
            text=True,
        ).strip()
    except (CalledProcessError, FileNotFoundError):
        return ""


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
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = f"{BASE_URL}{route}"
        modified = last_modified(path)
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
