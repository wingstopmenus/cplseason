#!/usr/bin/env python3
"""Add structured, editorial-safe career facts to CPL player data.

The script uses Wikipedia's cricketer infoboxes as a research input, stores only
normalized facts, and deliberately excludes reference URLs and copied article
prose from the published data.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAYER_DIR = ROOT / "data" / "players"
USER_AGENT = "CPLSeasonResearch/1.0 (contact@cplseason.com)"

TITLE_OVERRIDES = {
    "Brandon King": "Brandon King (cricketer)",
    "Chris Green": "Chris Green (cricketer)",
    "Glenn Phillips": "Glenn Phillips (cricketer)",
    "Hassan Khan": "Hassan Khan (cricketer)",
    "Mujeeb ur Rahman": "Mujeeb Ur Rahman",
    "Nikhil Chaudhary": "Nikhil Chaudhary (cricketer)",
    "Usman Khan": "Usman Khan (cricketer)",
    "Zachary Carter": "Zachary Carter (cricketer)",
}

FORMAT_ORDER = ("T20", "T20I", "ODI", "Test", "LA", "FC")


def api_request(params: dict[str, object]) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    request = urllib.request.Request(
        f"https://en.wikipedia.org/w/api.php?{query}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def strip_markup(value: str) -> str:
    value = re.sub(r"<ref\b[^>]*>.*?</ref>", "", value, flags=re.I | re.S)
    value = re.sub(r"<ref\b[^>]*/>", "", value, flags=re.I)
    value = re.sub(r"<!--.*?-->", "", value, flags=re.S)
    value = re.sub(r"\{\{nowrap\|([^{}]+)\}\}", r"\1", value, flags=re.I)
    value = re.sub(r"\{\{small\|([^{}]+)\}\}", r"\1", value, flags=re.I)
    value = re.sub(r"\{\{sortname\|([^|{}]+)\|([^|{}]+).*?\}\}", r"\1 \2", value)
    value = re.sub(r"\{\{.*?\}\}", "", value, flags=re.S)
    value = re.sub(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]", r"\1", value)
    value = re.sub(r"\|(?:year|club)\d+\s*=.*$", "", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", "", value)
    value = value.replace("'''", "").replace("''", "")
    value = value.replace("&ndash;", "–").replace("&mdash;", "—").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", value).strip(" ,;|")


def birth_date(value: str) -> str:
    match = re.search(
        r"\{\{(?:birth date and age|birth date)\|(\d{4})\|(\d{1,2})\|(\d{1,2})",
        value,
        flags=re.I,
    )
    if not match:
        return strip_markup(value)
    year, month, day = map(int, match.groups())
    months = (
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    )
    return f"{day} {months[month - 1]} {year}"


def extract_infobox(wikitext: str) -> dict[str, str]:
    start = re.search(r"\{\{Infobox cricketer\b", wikitext, flags=re.I)
    if not start:
        return {}
    depth = 0
    end = None
    index = start.start()
    while index < len(wikitext) - 1:
        pair = wikitext[index:index + 2]
        if pair == "{{":
            depth += 1
            index += 2
            continue
        if pair == "}}":
            depth -= 1
            index += 2
            if depth == 0:
                end = index
                break
            continue
        index += 1
    if end is None:
        return {}

    box = wikitext[start.start():end]
    fields: dict[str, str] = {}
    current_key = ""
    current_value: list[str] = []
    for line in box.splitlines()[1:]:
        field = re.match(r"^\s*\|\s*([^=]+?)\s*=\s*(.*)$", line)
        if field:
            if current_key:
                fields[current_key] = "\n".join(current_value).strip()
            current_key = re.sub(r"\s+", " ", field.group(1).strip().lower())
            current_value = [field.group(2)]
        elif current_key:
            current_value.append(line)
    if current_key:
        fields[current_key] = "\n".join(current_value).strip()
    return fields


def field(fields: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = fields.get(key.lower(), "")
        if value:
            return strip_markup(value)
    return ""


def career_teams(fields: dict[str, str]) -> list[str]:
    teams: list[str] = []
    for number in range(1, 31):
        value = field(fields, f"club{number}")
        if value and value not in teams:
            teams.append(value)
    return teams[-6:]


def record_rows(fields: dict[str, str]) -> list[dict[str, str]]:
    columns: dict[str, dict[str, str]] = {}
    for number in range(1, 7):
        label = field(fields, f"column{number}")
        if not label:
            continue
        normalized = {
            "Twenty20": "T20",
            "Twenty20 International": "T20I",
            "One Day International": "ODI",
            "List A": "LA",
            "First-class cricket": "FC",
            "First-class": "FC",
            "Test cricket": "Test",
        }.get(label, label)
        columns[normalized] = {
            "format": normalized,
            "matches": field(fields, f"matches{number}"),
            "runs": field(fields, f"runs{number}"),
            "wickets": field(fields, f"wickets{number}"),
            "best_bowling": field(fields, f"best bowling{number}"),
            "hundreds_fifties": field(fields, f"100s/50s{number}"),
        }
    ordered = [columns[name] for name in FORMAT_ORDER if name in columns]
    return ordered[:3]


def normalized_profile(fields: dict[str, str]) -> dict[str, object]:
    return {
        "full_name": field(fields, "fullname", "name"),
        "birth_date": birth_date(fields.get("birth date", fields.get("birth_date", ""))),
        "birth_place": field(fields, "birth place", "birth_place"),
        "country": field(fields, "country"),
        "role": field(fields, "role"),
        "batting_style": field(fields, "batting"),
        "bowling_style": field(fields, "bowling"),
        "international_span": field(fields, "internationalspan", "international span"),
        "career_teams": career_teams(fields),
        "records": record_rows(fields),
    }


def main() -> None:
    paths = sorted(PLAYER_DIR.glob("*.json"))
    enriched = 0
    for index, path in enumerate(paths, start=1):
        player = json.loads(path.read_text(encoding="utf-8"))
        title = TITLE_OVERRIDES.get(player["name"], player["name"])
        try:
            parsed = api_request(
                {"action": "parse", "page": title, "prop": "wikitext"}
            ).get("parse", {})
            fields = extract_infobox(parsed.get("wikitext", ""))
        except Exception as error:
            print(f"[{index:03d}/{len(paths)}] {player['name']}: {error}")
            fields = {}

        profile = normalized_profile(fields) if fields else {
            "full_name": player["name"],
            "birth_date": "",
            "birth_place": "",
            "country": "",
            "role": "",
            "batting_style": "",
            "bowling_style": "",
            "international_span": "",
            "career_teams": [],
            "records": [],
        }
        player["profile"] = profile
        path.write_text(
            json.dumps(player, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        if fields:
            enriched += 1
        if index % 20 == 0 or index == len(paths):
            print(f"Processed {index}/{len(paths)} players")
        time.sleep(0.08)

    print(f"Structured career facts added for {enriched}/{len(paths)} players")


if __name__ == "__main__":
    main()
