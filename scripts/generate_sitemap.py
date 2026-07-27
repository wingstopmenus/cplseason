#!/usr/bin/env python3
"""Generate sitemap.xml from the deployable HTML routes."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from xml.etree.ElementTree import Element, ElementTree, SubElement, indent

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://cplseason.com"


def route_for(path: Path) -> str:
    relative = path.relative_to(ROOT)
    if relative.name == "index.html":
        parent = relative.parent.as_posix()
        return "/" if parent == "." else f"/{parent}/"
    return f"/{relative.as_posix()}"


def main() -> None:
    html_files = sorted(
        path
        for path in ROOT.rglob("*.html")
        if not any(part in {".git", "templates"} for part in path.parts)
        and path.name != "404.html"
    )
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    urlset = Element("urlset", xmlns=namespace)
    modified = date.today().isoformat()
    for path in html_files:
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = f"{BASE_URL}{route_for(path)}"
        SubElement(url, "lastmod").text = modified
    indent(urlset, space="  ")
    ElementTree(urlset).write(
        ROOT / "sitemap.xml",
        encoding="utf-8",
        xml_declaration=True,
    )
    print(f"Generated sitemap.xml with {len(html_files)} URLs")


if __name__ == "__main__":
    main()
