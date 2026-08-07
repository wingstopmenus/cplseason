#!/usr/bin/env python3
"""Render generated CPL Season pages from structured data."""

from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

ROOT = Path(__file__).resolve().parent
TEAM_ORDER = [
    "antigua-barbuda-falcons",
    "barbados-royals",
    "guyana-amazon-warriors",
    "jamaica-kingsmen",
    "st-kitts-nevis-patriots",
    "saint-lucia-kings",
    "trinbago-knight-riders",
]
CATEGORY_ORDER = [
    ("West Indian players", "West Indian player"),
    ("Overseas players", "Overseas player"),
    ("Breakout players", "Breakout player"),
]
SHORT_NAMES = {
    "antigua-barbuda-falcons": "Falcons",
    "barbados-royals": "Tridents",
    "guyana-amazon-warriors": "Warriors",
    "jamaica-kingsmen": "Kingsmen",
    "st-kitts-nevis-patriots": "Patriots",
    "saint-lucia-kings": "Kings",
    "trinbago-knight-riders": "Knight Riders",
}
SEO_SHORT_NAMES = {
    **SHORT_NAMES,
    "trinbago-knight-riders": "TKR",
}
VENUE_ORDER = [
    "arnos-vale-stadium",
    "sabina-park",
    "daren-sammy-cricket-ground",
    "sir-vivian-richards-stadium",
    "queens-park-oval",
    "warner-park",
    "providence-stadium",
    "kensington-oval",
]
MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
NEWS_AUTHOR_BY_SLUG = {
    "antigua-barbuda-falcons-overseas-players-2026": "waseem-sial",
    "barbados-tridents-overseas-players-2026": "waseem-sial",
    "charles-wilkin-cpl-tribute": "shakir-ali",
    "cpl-2026-schedule-window-confirmed": "asad-sial",
    "cpl-2026-venues-guide": "shakir-ali",
    "guyana-amazon-warriors-overseas-players-2026": "waseem-sial",
    "jamaica-kingsmen-join-cpl-2026-field": "saleem-sial",
    "jamaica-kingsmen-overseas-players-2026": "waseem-sial",
    "rush-live-louder-cpl-2026-caribbean": "arshad-sial",
    "saint-lucia-kings-overseas-players-2026": "waseem-sial",
    "sir-garfield-sobers-cpl-tribute": "shakir-ali",
    "st-kitts-nevis-patriots-overseas-players-2026": "waseem-sial",
    "trinbago-knight-riders-overseas-players-2026": "waseem-sial",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def build_home_player_pool() -> None:
    teams = {
        path.stem: load_json(path)
        for path in (ROOT / "data" / "teams").glob("*.json")
    }
    pool = []
    for path in sorted((ROOT / "data" / "players").glob("*.json")):
        player = load_json(path)
        team = teams.get(player.get("team_slug"))
        if not team or not player.get("image"):
            continue
        pool.append({
            "slug": player["slug"],
            "name": player["name"],
            "category": player["category"],
            "image": player["image"],
            "team": team["name"],
        })
    output = ROOT / "static" / "home-player-pool.json"
    output.write_text(json.dumps(pool, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Generated homepage player pool with {len(pool)} players")


def template_environment() -> Environment:
    return Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=select_autoescape(["html"]),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )


def build_contact_page() -> None:
    rendered = template_environment().get_template("contact.html").render()
    output = ROOT / "contact-us" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)}")


def build_privacy_policy() -> None:
    rendered = template_environment().get_template("privacy-policy.html").render()
    output = ROOT / "privacy-policy" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)}")


def build_terms_of_service() -> None:
    rendered = template_environment().get_template("terms-of-service.html").render()
    output = ROOT / "terms-of-service" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)}")


def human_date(value: str) -> str:
    year, month, day = (int(part) for part in value[:10].split("-"))
    return f"{day} {MONTH_NAMES[month]} {year}"


def load_authors() -> dict[str, dict]:
    authors = {}
    for path in sorted((ROOT / "data" / "authors").glob("*.json")):
        author = load_json(path)
        if author["slug"] != path.stem:
            raise ValueError(f"Author slug mismatch in {path.relative_to(ROOT)}")
        author["canonical"] = f"https://cplseason.com/authors/{author['slug']}/"
        author["first_name"] = author["name"].split()[0]
        authors[author["slug"]] = author
    return authors


def build_authors() -> None:
    authors_by_slug = load_authors()
    authors = [
        authors_by_slug[slug]
        for slug in (
            "saleem-sial",
            "arshad-sial",
            "shakir-ali",
            "waseem-sial",
            "asad-sial",
        )
    ]
    article_paths = sorted((ROOT / "data" / "news").glob("*.json"))
    articles = []
    for path in article_paths:
        article = load_json(path)
        article["author_slug"] = article.get(
            "author_slug", NEWS_AUTHOR_BY_SLUG.get(article["slug"], "asad-sial")
        )
        article["date_label"] = human_date(article["date_published"])
        articles.append(article)
    articles.sort(
        key=lambda item: (item.get("published_at", item["date_published"]), item["title"]),
        reverse=True,
    )

    page = {
        "title": "CPL Season Authors: Meet Our Editorial Team",
        "description": (
            "Meet the named editors and writers responsible for CPL Season "
            "fixtures, squads, players, venues, standings, broadcast guides and news."
        ),
        "canonical": "https://cplseason.com/authors/",
        "date_modified": max(author["last_updated"] for author in authors),
    }
    index_schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": page["date_modified"],
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
                "mainEntity": {"@id": f"{page['canonical']}#authors"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Authors",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "ItemList",
                "@id": f"{page['canonical']}#authors",
                "numberOfItems": len(authors),
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "url": author["canonical"],
                        "name": author["name"],
                    }
                    for index, author in enumerate(authors, start=1)
                ],
            },
        ],
    }
    rendered = template_environment().get_template("authors.html").render(
        page=page,
        authors=authors,
        schema_json=json.dumps(
            index_schema, ensure_ascii=False, separators=(",", ":")
        ),
    )
    output = ROOT / "authors" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")

    template = template_environment().get_template("author.html")
    for author in authors:
        author_articles = [
            article
            for article in articles
            if article["author_slug"] == author["slug"]
        ]
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "ProfilePage",
                    "@id": f"{author['canonical']}#webpage",
                    "url": author["canonical"],
                    "name": f"{author['name']} | CPL Season",
                    "description": author["description"],
                    "dateModified": author["last_updated"],
                    "mainEntity": {"@id": f"{author['canonical']}#person"},
                    "breadcrumb": {"@id": f"{author['canonical']}#breadcrumb"},
                },
                {
                    "@type": "Person",
                    "@id": f"{author['canonical']}#person",
                    "name": author["name"],
                    "url": author["canonical"],
                    "image": f"https://cplseason.com{author['image']}",
                    "jobTitle": author["full_role"],
                    "description": author["description"],
                    "worksFor": {
                        "@type": "Organization",
                        "name": "CPL Season",
                        "url": "https://cplseason.com/",
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{author['canonical']}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://cplseason.com/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Authors",
                            "item": page["canonical"],
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": author["name"],
                            "item": author["canonical"],
                        },
                    ],
                },
            ],
        }
        rendered = template.render(
            author=author,
            articles=author_articles[:6],
            schema_json=json.dumps(
                schema, ensure_ascii=False, separators=(",", ":")
            ),
        )
        output = ROOT / "authors" / author["slug"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")

    print(f"Rendered authors/index.html and {len(authors)} author profile pages")


def build_homepage_news(articles: list[dict]) -> None:
    """Replace the homepage news module with the three newest news records."""
    if len(articles) < 3:
        raise ValueError("Homepage news module requires at least three articles")

    rendered = (
        template_environment()
        .get_template("partials/home-news.html")
        .render(articles=articles[:3])
        .strip()
    )
    homepage = ROOT / "index.html"
    source = homepage.read_text(encoding="utf-8")
    stylesheet = '<link rel="stylesheet" href="/static/css/home-news.css?v=20260729">'
    if stylesheet not in source:
        source = source.replace("</head>", f"  {stylesheet}\n</head>", 1)
    marker_pattern = re.compile(
        r"<!-- AUTO:HOME_NEWS:START -->.*?<!-- AUTO:HOME_NEWS:END -->",
        re.DOTALL,
    )
    legacy_pattern = re.compile(
        r'<section class="band home-news-band">.*?</section>',
        re.DOTALL,
    )
    pattern = marker_pattern if marker_pattern.search(source) else legacy_pattern
    updated, replacements = pattern.subn(rendered, source, count=1)
    if replacements != 1:
        raise ValueError("Expected one homepage news module in index.html")
    homepage.write_text(updated, encoding="utf-8")
    print(
        "Updated homepage news module with "
        + ", ".join(article["slug"] for article in articles[:3])
    )


def build_homepage_watch_live(
    guide: dict, opening_fixtures: list[dict]
) -> None:
    """Render the homepage viewing guide from the main broadcast data."""
    confirmed_routes = [
        route for route in guide["status"] if route["status"] == "Confirmed"
    ]
    if not confirmed_routes or not opening_fixtures:
        raise ValueError("Homepage watch module requires coverage and a fixture")

    rendered = (
        template_environment()
        .get_template("partials/home-watch-live.html")
        .render(
            guide=guide,
            confirmed_routes=confirmed_routes,
            spotlight_fixture=opening_fixtures[0],
        )
        .strip()
    )
    homepage = ROOT / "index.html"
    source = homepage.read_text(encoding="utf-8")
    stylesheet = (
        '<link rel="stylesheet" '
        'href="/static/css/home-watch-live.css?v=20260801hw">'
    )
    if stylesheet not in source:
        source = source.replace("</head>", f"  {stylesheet}\n</head>", 1)

    marker_pattern = re.compile(
        r"<!-- AUTO:HOME_WATCH:START -->.*?<!-- AUTO:HOME_WATCH:END -->",
        re.DOTALL,
    )
    if marker_pattern.search(source):
        updated, replacements = marker_pattern.subn(rendered, source, count=1)
    else:
        news_end = "<!-- AUTO:HOME_NEWS:END -->"
        if news_end not in source:
            raise ValueError("Homepage news marker is missing from index.html")
        updated = source.replace(news_end, f"{news_end}\n\n{rendered}", 1)
        replacements = 1

    if replacements != 1:
        raise ValueError("Expected one homepage watch module in index.html")
    homepage.write_text(updated, encoding="utf-8")
    print(
        "Updated homepage watch module with "
        + ", ".join(route["platform"] for route in confirmed_routes)
    )


def build_news() -> None:
    article_paths = sorted((ROOT / "data" / "news").glob("*.json"))
    players = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    teams = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "teams").glob("*.json"))
    }
    authors = load_authors()
    articles = []
    for path in article_paths:
        article = load_json(path)
        article["author_slug"] = article.get(
            "author_slug", NEWS_AUTHOR_BY_SLUG.get(article["slug"], "asad-sial")
        )
        article["author"] = authors[article["author_slug"]]
        article["canonical"] = f"https://cplseason.com/news/{article['slug']}/"
        article["date_label"] = human_date(article["date_published"])
        article["modified_label"] = human_date(article["date_modified"])
        article["players"] = [
            players[slug] for slug in article.get("player_slugs", [])
        ]
        article["team"] = (
            teams[article["team_slug"]] if article.get("team_slug") else None
        )
        for section in article["sections"]:
            squad_team_slug = section.get("squad_team_slug")
            if not squad_team_slug:
                section["squad"] = None
                continue
            if squad_team_slug not in teams:
                raise ValueError(
                    f"{article['slug']}: unknown squad team {squad_team_slug}"
                )
            squad_players = section.get("squad_players", [])
            if len(squad_players) != 17:
                raise ValueError(
                    f"{article['slug']}: {squad_team_slug} must list 17 players"
                )
            split_at = (len(squad_players) + 1) // 2
            squad_rows = []
            for index in range(split_at):
                right_index = index + split_at
                squad_rows.append(
                    {
                        "left_number": index + 1,
                        "left_name": squad_players[index],
                        "right_number": (
                            right_index + 1
                            if right_index < len(squad_players)
                            else None
                        ),
                        "right_name": (
                            squad_players[right_index]
                            if right_index < len(squad_players)
                            else None
                        ),
                    }
                )
            section["squad"] = {
                "team": teams[squad_team_slug],
                "rows": squad_rows,
                "player_count": len(squad_players),
            }
        articles.append(article)
    articles.sort(
        key=lambda item: (item.get("published_at", item["date_published"]), item["title"]),
        reverse=True,
    )

    page = {
        "title": "CPL 2026 News: Team, Fixture and Tournament Updates",
        "description": (
            "Read CPL 2026 news on squad announcements, fixtures, venues and "
            "broadcast coverage before the season runs from 7 August to 20 September."
        ),
        "canonical": "https://cplseason.com/news/",
        "date_modified": max(item["date_modified"] for item in articles),
    }
    index_schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": page["date_modified"],
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
                "mainEntity": {"@id": f"{page['canonical']}#stories"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "News",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "ItemList",
                "@id": f"{page['canonical']}#stories",
                "numberOfItems": len(articles),
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "url": article["canonical"],
                        "name": article["title"],
                    }
                    for index, article in enumerate(articles, start=1)
                ],
            },
        ],
    }
    rendered = template_environment().get_template("news.html").render(
        page=page,
        articles=articles,
        schema_json=json.dumps(
            index_schema, ensure_ascii=False, separators=(",", ":")
        ),
    )
    output = ROOT / "news" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    build_homepage_news(articles)

    template = template_environment().get_template("news-article.html")
    for article in articles:
        article_body_parts = [
            re.sub(r"<[^>]+>", "", paragraph)
            for section in article["sections"]
            for paragraph in section["paragraphs"]
        ]
        article_body_parts.extend(
            " ".join(section.get("squad_players", []))
            for section in article["sections"]
            if section.get("squad_players")
        )
        article_body_parts.extend(
            " ".join((event["name"], event["date_range"], event["venue"]))
            for event in article.get("ticket_events", [])
        )
        article_body_parts.extend(
            " ".join((step["title"], step["text"]))
            for step in article.get("challenge_join_steps", [])
        )
        article_body = " ".join(article_body_parts)
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "NewsArticle",
                    "@id": f"{article['canonical']}#article",
                    "mainEntityOfPage": article["canonical"],
                    "url": article["canonical"],
                    "headline": article["title"],
                    "description": article["description"],
                    "datePublished": article["date_published"],
                    "dateModified": article["date_modified"],
                    "image": f"https://cplseason.com{article['image']}",
                    "articleSection": article["category"],
                    "articleBody": article_body,
                    "author": {
                        "@type": "Person",
                        "name": article["author"]["name"],
                        "url": article["author"]["canonical"],
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "CPL Season",
                        "url": "https://cplseason.com/",
                        "logo": {
                            "@type": "ImageObject",
                            "url": (
                                "https://cplseason.com/static/img/brand/"
                                "cplseason-logo.webp"
                            ),
                        },
                    },
                    "breadcrumb": {"@id": f"{article['canonical']}#breadcrumb"},
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{article['canonical']}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://cplseason.com/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "News",
                            "item": page["canonical"],
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": article["title"],
                            "item": article["canonical"],
                        },
                    ],
                },
            ],
        }
        rendered = template.render(
            article=article,
            schema_json=json.dumps(
                schema, ensure_ascii=False, separators=(",", ":")
            ),
        )
        output = ROOT / "news" / article["slug"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered news/index.html and {len(articles)} complete news stories")


def build_squads() -> None:
    players = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    teams = []
    category_counts: Counter[str] = Counter()

    for team_slug in TEAM_ORDER:
        team = load_json(ROOT / "data" / "teams" / f"{team_slug}.json")
        roster = [players[slug] for slug in team["roster"]]
        category_counts.update(player["category"] for player in roster)
        team["short_name"] = SHORT_NAMES[team_slug]
        team["players"] = roster
        team["groups"] = []
        for label, category in CATEGORY_ORDER:
            grouped = []
            for player in roster:
                if player["category"] != category:
                    continue
                item = dict(player)
                item["category_slug"] = category.lower().replace(" ", "-")
                item["captain"] = (
                    team_slug == "jamaica-kingsmen"
                    and player["slug"] == "rovman-powell"
                )
                grouped.append(item)
            if grouped:
                team["groups"].append({"label": label, "players": grouped})
        teams.append(team)

    total_players = sum(len(team["players"]) for team in teams)
    directory_updated = max(
        player["last_updated"]
        for team in teams
        for player in team["players"]
    )
    page = {
        "title": "CPL 2026 Squads: Players for All Seven Teams",
        "description": (
            f"See all {total_players} players named across the seven CPL 2026 squads, "
            "grouped by team and player category with a profile page for each name."
        ),
        "canonical": "https://cplseason.com/squads/",
        "checked_label": human_date(directory_updated),
    }
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": directory_updated,
                "mainEntity": {
                    "@type": "ItemList",
                    "numberOfItems": total_players,
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": index,
                            "url": f"https://cplseason.com/player/{player['slug']}/",
                            "name": player["name"],
                        }
                        for index, player in enumerate(
                            (player for team in teams for player in team["players"]),
                            start=1,
                        )
                    ],
                },
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Squads",
                        "item": page["canonical"],
                    },
                ],
            },
        ],
    }
    env = template_environment()
    rendered = env.get_template("squads.html").render(
        page=page,
        teams=teams,
        totals={
            "teams": len(teams),
            "players": total_players,
            "overseas": category_counts["Overseas player"],
        },
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "squads" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)} with {total_players} players")


def build_players() -> None:
    players_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    teams = []
    category_counts: Counter[str] = Counter()

    for team_slug in TEAM_ORDER:
        team = load_json(ROOT / "data" / "teams" / f"{team_slug}.json")
        roster = []
        for player_slug in team["roster"]:
            player = dict(players_by_slug[player_slug])
            player["category_slug"] = player["category"].lower().replace(" ", "-")
            player["role"] = player.get("profile", {}).get("role") or player["category"].removesuffix(" player")
            role_key = player["role"].casefold()
            if "wicket" in role_key or "keeper" in role_key:
                player["role_slug"] = "wicketkeeper"
            elif "all-round" in role_key or "all round" in role_key or "allround" in role_key:
                player["role_slug"] = "all-rounder"
            elif "bowl" in role_key:
                player["role_slug"] = "bowler"
            elif "batt" in role_key or "batsman" in role_key:
                player["role_slug"] = "batter"
            else:
                player["role_slug"] = "other"
            player["team_name"] = team["name"]
            player["team_slug"] = team_slug
            player["team_short_name"] = SHORT_NAMES[team_slug]
            player["team_logo"] = team["logo"]
            player["captain"] = (
                team_slug == "jamaica-kingsmen"
                and player_slug == "rovman-powell"
            )
            roster.append(player)
        roster.sort(key=lambda player: player["name"].casefold())
        category_counts.update(player["category"] for player in roster)
        team["short_name"] = SHORT_NAMES[team_slug]
        team["players"] = roster
        teams.append(team)

    all_players = [player for team in teams for player in team["players"]]
    portrait_count = sum(bool(player["image"]) for player in all_players)
    directory_updated = max(player["last_updated"] for player in all_players)
    directory_updated_display = datetime.strptime(directory_updated, "%Y-%m-%d").strftime("%d %b %Y")
    players_by_directory_slug = {player["slug"]: player for player in all_players}
    featured_players = [
        players_by_directory_slug[slug]
        for slug in (
            "andre-russell",
            "shimron-hetmyer",
            "nicholas-pooran",
            "shamar-joseph",
            "alzarri-joseph",
            "sunil-narine",
            "rovman-powell",
            "jason-holder",
        )
        if slug in players_by_directory_slug
    ]
    role_players = [
        players_by_directory_slug[slug]
        for slug in ("shimron-hetmyer", "nicholas-pooran", "andre-russell", "alzarri-joseph")
        if slug in players_by_directory_slug
    ]
    faqs = [
        {
            "question": "How many players are listed for CPL 2026?",
            "answer": f"This directory currently lists {len(all_players)} announced player profiles across seven CPL 2026 franchises.",
        },
        {
            "question": "Can I filter CPL 2026 players by team?",
            "answer": "Yes. Use the team and squad-category filters to narrow the directory, or search by player or franchise name.",
        },
        {
            "question": "Are these the confirmed playing XIs?",
            "answer": "No. These are announced squad players. A match playing XI is only confirmed after the toss and the official team-sheet release.",
        },
        {
            "question": "Can CPL squads change during the season?",
            "answer": "Yes. Availability, injuries and approved replacements can change a squad, so the directory is updated when new team information is confirmed.",
        },
    ]
    page = {
        "title": "CPL 2026 Players by Team: Full Squad List",
        "description": (
            f"Find all {len(all_players)} players named for CPL 2026, browse each team roster "
            "and open profiles showing squad category and franchise details."
        ),
        "canonical": "https://cplseason.com/players/",
    }
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": directory_updated,
                "mainEntity": {
                    "@type": "ItemList",
                    "name": "CPL 2026 player profiles",
                    "numberOfItems": len(all_players),
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": index,
                            "url": f"https://cplseason.com/player/{player['slug']}/",
                            "name": player["name"],
                        }
                        for index, player in enumerate(all_players, start=1)
                    ],
                },
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Players",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in faqs
                ],
            },
        ],
    }
    rendered = template_environment().get_template("players.html").render(
        page=page,
        teams=teams,
        all_players=all_players,
        featured_players=featured_players,
        role_players=role_players,
        faqs=faqs,
        directory_updated_display=directory_updated_display,
        totals={
            "teams": len(teams),
            "players": len(all_players),
            "portraits": portrait_count,
            "fallbacks": len(all_players) - portrait_count,
            "west_indian": category_counts["West Indian player"],
            "overseas": category_counts["Overseas player"],
            "breakout": category_counts["Breakout player"],
        },
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "players" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)} with {len(all_players)} players")


def player_about_copy(player: dict, team: dict) -> dict:
    profile = player.get("profile", {})
    full_name = profile.get("full_name") or player["name"]
    role = profile.get("role", "")
    birth_date = profile.get("birth_date", "")
    birth_place = profile.get("birth_place", "")
    country = profile.get("country", "")
    batting = profile.get("batting_style", "")
    bowling = profile.get("bowling_style", "")
    international_span = profile.get("international_span", "")
    career_teams = profile.get("career_teams", [])
    records = profile.get("records", [])

    identity_parts = []
    if birth_date and birth_place:
        identity_parts.append(f"Born on {birth_date} in {birth_place},")
    elif birth_date:
        identity_parts.append(f"Born on {birth_date},")
    elif birth_place:
        identity_parts.append(f"From {birth_place},")

    if role:
        role_article = (
            "an" if role.lower().startswith(("a", "e", "i", "o", "u")) else "a"
        )
        identity_parts.append(
            f"{full_name} is {role_article} {role.lower()} selected by {team['name']} for CPL 2026."
        )
    else:
        identity_parts.append(
            f"{full_name} is part of the {team['name']} squad for CPL 2026."
        )

    style_parts = []
    if batting:
        style_parts.append(f"bats {batting.lower()}")
    if bowling:
        style_parts.append(f"bowls {bowling.lower()}")
    style_sentence = ""
    if style_parts:
        style_sentence = (
            f" On the field, {player['name']} "
            + " and ".join(style_parts)
            + "."
        )

    country_sentence = ""
    if country:
        country_sentence = f" {player['name']} represents {country}."

    biography = " ".join(identity_parts) + style_sentence + country_sentence

    career_sentences = []
    if international_span and country:
        career_sentences.append(
            f"{player['name']}'s international career with {country} spans "
            f"{international_span}."
        )
    elif country:
        career_sentences.append(
            f"{player['name']} has represented {country} in senior cricket."
        )

    if career_teams:
        if len(career_teams) == 1:
            teams_text = career_teams[0]
        else:
            teams_text = ", ".join(career_teams[:-1]) + f" and {career_teams[-1]}"
        career_sentences.append(f"The career has also included {teams_text}.")

    career_sentences.append(
        f"In CPL 2026, {player['name']} joins {team['name']} in the "
        f"{player['category']} group. {player['selection_note']}."
    )
    career = " ".join(career_sentences)

    if not records:
        records = [
            {
                "format": "CPL 2026",
                "matches": "Squad",
                "runs": "",
                "wickets": "",
                "best_bowling": "",
                "hundreds_fifties": "",
            }
        ]

    return {
        "biography": biography,
        "career": career,
        "records": records,
    }


def build_player_profiles() -> None:
    players_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    teams_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "teams").glob("*.json"))
    }
    env = template_environment()
    template = env.get_template("player.html")

    for player_slug, source_player in players_by_slug.items():
        player = dict(source_player)
        team = dict(teams_by_slug[player["team_slug"]])
        team["short_name"] = SHORT_NAMES[team["slug"]]
        player["about"] = player_about_copy(player, team)
        player["captain"] = (
            team["slug"] == "jamaica-kingsmen"
            and player["slug"] == "rovman-powell"
        )
        roster_position = team["roster"].index(player_slug) + 1
        related_players = [
            players_by_slug[related_slug]
            for related_slug in team["roster"]
            if related_slug != player_slug
        ][:6]

        canonical = f"https://cplseason.com/player/{player_slug}/"
        title_candidates = (
            f"{player['name']} Profile: Career, Records and CPL 2026 Team",
            f"{player['name']} Profile: Records and CPL 2026 Team",
            f"{player['name']} Profile: Stats and CPL 2026 Team",
        )
        seo_title = next(
            (candidate for candidate in title_candidates if 50 <= len(candidate) <= 60),
            min(title_candidates, key=lambda candidate: abs(len(candidate) - 55)),
        )
        seo_description = (
            f"Read {player['name']}'s profile, biography, playing role, career "
            "record and CPL 2026 team, with verified squad information and "
            "clearly sourced cricket statistics."
        )
        if len(seo_description) > 160:
            seo_description = seo_description.replace("clearly ", "")
        if len(seo_description) > 160:
            seo_description = seo_description.replace("playing ", "")
        page = {
            "title": seo_title,
            "description": seo_description,
            "canonical": canonical,
            "og_image": (
                f"https://cplseason.com{player['image']}"
                if player["image"]
                else f"https://cplseason.com{team['logo']}"
            ),
            "updated_label": human_date(player["last_updated"]),
        }
        person_schema = {
            "@type": "Person",
            "@id": f"{canonical}#player",
            "name": player["name"],
            "url": canonical,
            "sport": "Cricket",
            "description": page["description"],
            "memberOf": {
                "@type": "SportsTeam",
                "name": team["name"],
                "sport": "Cricket",
                "url": f"https://cplseason.com/team/{team['slug']}/",
            },
        }
        if player["image"]:
            person_schema["image"] = f"https://cplseason.com{player['image']}"
        profile = player.get("profile", {})
        if profile.get("birth_date"):
            try:
                person_schema["birthDate"] = datetime.strptime(
                    profile["birth_date"], "%d %B %Y"
                ).date().isoformat()
            except ValueError:
                pass
        if profile.get("birth_place"):
            person_schema["birthPlace"] = profile["birth_place"]
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "ProfilePage",
                    "@id": f"{canonical}#webpage",
                    "url": canonical,
                    "name": page["title"],
                    "description": page["description"],
                    "dateModified": player["last_updated"],
                    "mainEntity": {"@id": f"{canonical}#player"},
                    "breadcrumb": {"@id": f"{canonical}#breadcrumb"},
                },
                person_schema,
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{canonical}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://cplseason.com/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Players",
                            "item": "https://cplseason.com/players/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": player["name"],
                            "item": canonical,
                        },
                    ],
                },
            ],
        }
        rendered = template.render(
            page=page,
            player=player,
            team=team,
            roster_number=f"{roster_position:02d}",
            related_players=related_players,
            schema_json=json.dumps(
                schema, ensure_ascii=False, separators=(",", ":")
            ),
        )
        output = ROOT / "player" / player_slug / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")

    print(f"Rendered {len(players_by_slug)} player profile pages")


def build_teams() -> None:
    players_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    venues_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }
    active_match_venues = {
        load_json(path)["venue_slug"]
        for path in (ROOT / "data" / "matches").glob("*.json")
    }
    all_venue_fixtures = [
        fixture
        for slug, venue in venues_by_slug.items()
        if slug in active_match_venues
        for fixture in venue["fixtures"]
        if " vs " in fixture["match"]
    ]
    teams = []
    for team_slug in TEAM_ORDER:
        team = load_json(ROOT / "data" / "teams" / f"{team_slug}.json")
        team["players"] = [players_by_slug[slug] for slug in team["roster"]]
        team["spotlight_players"] = team["players"][:3]
        team["venue"] = venues_by_slug[team["venue_slug"]]
        aliases = tuple(team["schedule_names"])
        team_fixtures = [
            fixture
            for fixture in all_venue_fixtures
            if any(alias in fixture["match"] for alias in aliases)
        ]
        home_fixtures = [
            fixture
            for fixture in team["venue"]["fixtures"]
            if any(alias in fixture["match"] for alias in aliases)
        ]
        if len(team_fixtures) != team["league_fixtures"]:
            raise ValueError(
                f"{team_slug}: found {len(team_fixtures)} schedule matches, "
                f"expected {team['league_fixtures']}"
            )
        if len(home_fixtures) != team["home_matches"]:
            raise ValueError(
                f"{team_slug}: found {len(home_fixtures)} home matches, "
                f"expected {team['home_matches']}"
            )
        team["home_window"] = (
            f"{home_fixtures[0]['label'].split(' ', 1)[1]}–"
            f"{home_fixtures[-1]['label'].split(' ', 1)[1]}"
        )
        teams.append(team)

    total_players = sum(len(team["players"]) for team in teams)
    page = {
        "title": "CPL 2026 Teams: Squads, Fixtures and Home Grounds",
        "description": (
            "Meet the seven CPL 2026 teams, compare their squad lists, home "
            "grounds and league fixtures, and read each franchise's history "
            "and title record."
        ),
        "canonical": "https://cplseason.com/teams/",
    }
    faq = [
        {
            "question": "Which teams are playing in CPL 2026?",
            "answer": (
                "Seven franchises are listed for CPL 2026: "
                + ", ".join(team["name"] for team in teams[:-1])
                + f", and {teams[-1]['name']}."
            ),
        },
        {
            "question": "Which team are the defending CPL champions?",
            "answer": (
                f"{next(team['name'] for team in teams if team['status_label'] == 'Defending champions')} "
                "enter the 2026 season as defending champions after winning "
                "the 2025 title."
            ),
        },
        {
            "question": "How many league matches does each CPL 2026 team play?",
            "answer": (
                "Each team has 10 league-stage fixtures. The top four teams "
                "advance to the playoffs at Kensington Oval."
            ),
        },
        {
            "question": "Why do some team pages list more than 17 names?",
            "answer": (
                "Some players are available for only part of the season, so a "
                "team page may include replacements alongside the original "
                "squad. Match-day selection still depends on availability."
            ),
        },
    ]
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": "2026-07-27",
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
                "mainEntity": {"@id": f"{page['canonical']}#teams"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Teams",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "ItemList",
                "@id": f"{page['canonical']}#teams",
                "name": "CPL 2026 teams",
                "numberOfItems": len(teams),
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "name": team["name"],
                        "url": f"https://cplseason.com/team/{team['slug']}/",
                        "item": {
                            "@type": "SportsTeam",
                            "name": team["name"],
                            "sport": "Cricket",
                            "url": f"https://cplseason.com/team/{team['slug']}/",
                            "logo": f"https://cplseason.com{team['logo']}",
                            "location": {
                                "@type": "Place",
                                "name": team["territory"],
                            },
                            "member": [
                                {
                                    "@type": "Person",
                                    "name": player["name"],
                                    "url": (
                                        "https://cplseason.com/player/"
                                        f"{player['slug']}/"
                                    ),
                                }
                                for player in team["players"]
                            ],
                        },
                    }
                    for index, team in enumerate(teams, start=1)
                ],
            },
            {
                "@type": "FAQPage",
                "@id": f"{page['canonical']}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in faq
                ],
            },
        ],
    }
    rendered = template_environment().get_template("teams.html").render(
        page=page,
        teams=teams,
        totals={
            "teams": len(teams),
            "league_matches": sum(
                team["league_fixtures"] for team in teams
            ) // 2,
            "players": total_players,
        },
        faq=faq,
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "teams" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered teams/index.html with {len(teams)} teams")


def build_team_profiles() -> None:
    players_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    venues_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }
    history_data = load_json(ROOT / "data" / "cpl-history.json")
    history_stats = {
        item["team_slug"]: item
        for item in history_data["team_rankings"]
        if item.get("team_slug")
    }
    news_items = [
        load_json(path)
        for path in sorted((ROOT / "data" / "news").glob("*.json"))
    ]
    scheduled_fixtures = []
    for venue_slug in VENUE_ORDER:
        venue = venues_by_slug[venue_slug]
        for fixture in venue["fixtures"]:
            if " vs " not in fixture["match"]:
                continue
            scheduled_fixtures.append(
                {
                    **fixture,
                    "venue": venue,
                    "sequence": len(scheduled_fixtures) + 1,
                }
            )
    match_by_fixture = {}
    for path in sorted((ROOT / "data" / "matches").glob("*.json")):
        match_record = load_json(path)
        if match_record.get("home_team_slug") and match_record.get("away_team_slug"):
            key = (
                match_record["date"],
                frozenset(
                    (
                        match_record["home_team_slug"],
                        match_record["away_team_slug"],
                    )
                ),
            )
            match_by_fixture[key] = match_record

    teams = [
        load_json(ROOT / "data" / "teams" / f"{slug}.json")
        for slug in TEAM_ORDER
    ]
    template = template_environment().get_template("team.html")
    for team_index, team in enumerate(teams):
        roster = []
        for player_slug in team["roster"]:
            player = dict(players_by_slug[player_slug])
            player["initials"] = "".join(
                part[0] for part in player["name"].split() if part
            )[:2].upper()
            roster.append(player)
        team["players"] = roster
        team["venue"] = venues_by_slug[team["venue_slug"]]
        team["groups"] = []
        category_counts: Counter[str] = Counter(
            player["category"] for player in roster
        )
        for label, category in CATEGORY_ORDER:
            grouped = [player for player in roster if player["category"] == category]
            if grouped:
                team["groups"].append(
                    {
                        "label": label,
                        "category": category,
                        "count": len(grouped),
                        "players": grouped,
                    }
                )

        aliases = tuple(team["schedule_names"])
        fixtures = []
        for fixture in scheduled_fixtures:
            if not any(alias in fixture["match"] for alias in aliases):
                continue
            display_match = fixture["match"]
            for alias in aliases:
                if alias != team["name"]:
                    display_match = display_match.replace(alias, team["name"])
            fixture_team_slugs = frozenset(
                candidate["slug"]
                for candidate in teams
                if any(
                    alias in fixture["match"]
                    for alias in candidate["schedule_names"]
                )
            )
            match_record = match_by_fixture.get(
                (fixture["date"], fixture_team_slugs)
            )
            if not match_record:
                raise ValueError(
                    f"Missing match record for {fixture['date']} {fixture['match']}"
                )
            fixtures.append(
                {
                    **fixture,
                    "match": display_match,
                    "is_home": fixture["venue"]["slug"] == team["venue_slug"],
                    "match_url": f"/match/{match_record['slug']}/",
                    "status": match_record.get("status", "Scheduled"),
                    "result": match_record.get("result"),
                }
            )
        if len(fixtures) != team["league_fixtures"]:
            raise ValueError(
                f"{team['slug']}: found {len(fixtures)} profile fixtures, "
                f"expected {team['league_fixtures']}"
            )
        team["fixtures"] = fixtures
        team["results"] = [
            fixture
            for fixture in fixtures
            if fixture["status"].lower() in {"complete", "completed", "finished"}
            or fixture.get("result")
        ]
        team["overseas_players"] = [
            player for player in roster if player["category"] == "Overseas player"
        ]
        team["all_time_stats"] = history_stats.get(team["slug"], {
            "titles": 0,
            "finals": 0,
            "wins": 0,
            "losses": 0,
            "no_results": 0,
            "win_percentage": 0.0,
            "note": (
                "The franchise begins its CPL record in 2026."
                if team["founded"] == 2026
                else "The franchise has not yet completed a full CPL season."
            ),
        })
        team["related_articles"] = sorted(
            (
                article for article in news_items
                if team["slug"] in json.dumps(article, ensure_ascii=False)
            ),
            key=lambda article: article.get("date_published", ""),
            reverse=True,
        )[:3]

        home_fixtures = [fixture for fixture in fixtures if fixture["is_home"]]
        team["home_window"] = (
            f"{home_fixtures[0]['label'].split(' ', 1)[1]}–"
            f"{home_fixtures[-1]['label'].split(' ', 1)[1]}"
        )
        title_years = ", ".join(str(year) for year in team["title_years"])
        title_answer = (
            f"{team['name']} have won {team['title_count']} CPL "
            f"{'title' if team['title_count'] == 1 else 'titles'}: {title_years}."
            if team["title_count"]
            else f"{team['name']} are still pursuing their first CPL title."
        )
        faq = [
            {
                "question": f"How many CPL titles have {team['name']} won?",
                "answer": title_answer,
            },
            {
                "question": f"Where do {team['name']} play home matches?",
                "answer": (
                    f"{team['name']} play at {team['venue']['name']} in "
                    f"{team['venue']['city']}. The ground hosts "
                    f"{team['home_matches']} of their league fixtures in 2026."
                ),
            },
            {
                "question": f"How many players are listed for {team['name']} in 2026?",
                "answer": (
                    f"The published 2026 directory lists {len(roster)} names: "
                    f"{category_counts['West Indian player']} West Indian, "
                    f"{category_counts['Overseas player']} overseas and "
                    f"{category_counts['Breakout player']} breakout players. "
                    "Availability replacements are retained where officially announced."
                ),
            },
            {
                "question": f"When is {team['name']}'s first CPL 2026 match?",
                "answer": (
                    f"Their first listed match is {fixtures[0]['match']} on "
                    f"{fixtures[0]['label']} at {fixtures[0]['venue']['name']}."
                ),
            },
        ]
        canonical = f"https://cplseason.com/team/{team['slug']}/"
        page = {
            "title": f"{team['name']}: CPL 2026 Squad and Fixtures",
            "description": (
                f"See the {team['name']} CPL 2026 squad, all 10 league fixtures, "
                f"home matches at {team['venue']['name']}, CPL titles and "
                "franchise history."
            ),
            "canonical": canonical,
        }
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "ProfilePage",
                    "@id": f"{canonical}#webpage",
                    "url": canonical,
                    "name": page["title"],
                    "description": page["description"],
                    "dateModified": team["last_updated"],
                    "mainEntity": {"@id": f"{canonical}#team"},
                    "breadcrumb": {"@id": f"{canonical}#breadcrumb"},
                },
                {
                    "@type": "SportsTeam",
                    "@id": f"{canonical}#team",
                    "name": team["name"],
                    "url": canonical,
                    "sport": "Cricket",
                    "foundingDate": str(team["founded"]),
                    "logo": f"https://cplseason.com{team['logo']}",
                    "location": {
                        "@type": "Place",
                        "name": team["territory"],
                    },
                    "member": [
                        {
                            "@type": "Person",
                            "name": player["name"],
                            "url": (
                                "https://cplseason.com/player/"
                                f"{player['slug']}/"
                            ),
                        }
                        for player in roster
                    ],
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{canonical}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://cplseason.com/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Teams",
                            "item": "https://cplseason.com/teams/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": team["name"],
                            "item": canonical,
                        },
                    ],
                },
                {
                    "@type": "FAQPage",
                    "@id": f"{canonical}#faq",
                    "mainEntity": [
                        {
                            "@type": "Question",
                            "name": item["question"],
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": item["answer"],
                            },
                        }
                        for item in faq
                    ],
                },
            ],
        }
        related_teams = [
            teams[(team_index + offset) % len(teams)]
            for offset in (1, 2, 3)
        ]
        rendered = template.render(
            page=page,
            team=team,
            team_number=team_index + 1,
            category_counts=category_counts,
            related_teams=related_teams,
            faq=faq,
            schema_json=json.dumps(
                schema, ensure_ascii=False, separators=(",", ":")
            ),
        )
        output = ROOT / "team" / team["slug"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")

    print(f"Rendered {len(teams)} team profile pages")


def build_points_table() -> None:
    venues_by_slug = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }
    scheduled_fixtures = []
    for venue_slug in VENUE_ORDER:
        venue = venues_by_slug[venue_slug]
        for fixture in venue["fixtures"]:
            if " vs " not in fixture["match"]:
                continue
            scheduled_fixtures.append({**fixture, "venue": venue})

    teams = []
    for team_slug in TEAM_ORDER:
        team = load_json(ROOT / "data" / "teams" / f"{team_slug}.json")
        aliases = tuple(team["schedule_names"])
        first_fixture = next(
            fixture
            for fixture in scheduled_fixtures
            if any(alias in fixture["match"] for alias in aliases)
        )
        display_match = first_fixture["match"]
        for other_slug in TEAM_ORDER:
            other = load_json(ROOT / "data" / "teams" / f"{other_slug}.json")
            for alias in other["schedule_names"]:
                display_match = display_match.replace(alias, other["name"])
        team["standing"] = {
            "played": 0,
            "won": 0,
            "lost": 0,
            "no_result": 0,
            "nrr": "—",
            "points": 0,
        }
        team["next_fixture"] = {
            **first_fixture,
            "match": display_match,
        }
        teams.append(team)

    page = {
        "title": "CPL 2026 Points Table: Standings, NRR & Playoff Race",
        "description": (
            "Track the CPL 2026 points table for all seven teams, including "
            "wins, losses, net run rate, next fixtures and the four-team "
            "playoff qualification race."
        ),
        "canonical": "https://cplseason.com/points-table/",
        "date_modified": "2026-07-27",
        "checked_label": "27 July 2026",
    }
    faq = [
        {
            "question": "Why are all CPL 2026 teams on zero points?",
            "answer": (
                "The league begins on 7 August 2026. No official result exists "
                "yet, so every team correctly remains on zero matches and zero points."
            ),
        },
        {
            "question": "How many teams qualify for the CPL 2026 playoffs?",
            "answer": (
                "The top four teams after the 35-match league phase advance. "
                "First plays second in Qualifier 1, while third plays fourth "
                "in the Eliminator."
            ),
        },
        {
            "question": "What does NRR mean in the points table?",
            "answer": (
                "NRR means net run rate. It cannot be calculated before a team "
                "has completed a match, so the pre-season table displays a dash."
            ),
        },
        {
            "question": "When will this table update?",
            "answer": (
                "The table will update after completed matches when an official "
                "CPL standings update or scorecard confirms the result."
            ),
        },
    ]
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": page["date_modified"],
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
                "mainEntity": {"@id": f"{page['canonical']}#standings"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Points Table",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "ItemList",
                "@id": f"{page['canonical']}#standings",
                "name": "CPL 2026 pre-season points table",
                "numberOfItems": len(teams),
                "itemListOrder": "https://schema.org/ItemListUnordered",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "name": team["name"],
                        "url": f"https://cplseason.com/team/{team['slug']}/",
                    }
                    for index, team in enumerate(teams, start=1)
                ],
            },
            {
                "@type": "FAQPage",
                "@id": f"{page['canonical']}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in faq
                ],
            },
        ],
    }
    playoff_route = [
        {
            "date": "16 Sep",
            "name": "Eliminator",
            "teams": "3rd vs 4th",
            "outcome": "Winner reaches Qualifier 2",
            "url": "/match/cpl-2026-eliminator/",
        },
        {
            "date": "17 Sep",
            "name": "Qualifier 1",
            "teams": "1st vs 2nd",
            "outcome": "Winner reaches the final",
            "url": "/match/cpl-2026-qualifier-1/",
        },
        {
            "date": "18 Sep",
            "name": "Qualifier 2",
            "teams": "Eliminator winner vs Q1 loser",
            "outcome": "Winner reaches the final",
            "url": "/match/cpl-2026-qualifier-2/",
        },
        {
            "date": "20 Sep",
            "name": "Final",
            "teams": "Q1 winner vs Q2 winner",
            "outcome": "CPL 2026 champion",
            "url": "/match/cpl-2026-final/",
        },
    ]
    rendered = template_environment().get_template("points-table.html").render(
        page=page,
        teams=teams,
        faq=faq,
        playoff_route=playoff_route,
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "points-table" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)} with {len(teams)} teams")


def build_watch_live() -> None:
    guide = load_json(ROOT / "data" / "broadcast-guide.json")
    broadcast_announcement = load_json(
        ROOT / "data" / "news" / "cpl-2026-broadcast-partners-confirmed.json"
    )
    official_broadcasts = broadcast_announcement["broadcast_territories"]
    teams = {
        slug: load_json(ROOT / "data" / "teams" / f"{slug}.json")
        for slug in TEAM_ORDER
    }
    venues = {
        slug: load_json(ROOT / "data" / "venues" / f"{slug}.json")
        for slug in VENUE_ORDER
    }
    all_matches = [
        load_json(path)
        for path in (ROOT / "data" / "matches").glob("*.json")
    ]
    league_matches = sorted(
        (match for match in all_matches if match["stage"] == "League stage"),
        key=lambda match: match["match_number"],
    )
    opening_fixtures = []
    for match_record in league_matches[:5]:
        home_team = teams[match_record["home_team_slug"]]
        away_team = teams[match_record["away_team_slug"]]
        start = datetime.fromisoformat(match_record["start_iso"])
        opening_fixtures.append(
            {
                "date": match_record["date"],
                "label": f"{start.strftime('%a')} {start.day} {start.strftime('%b')}",
                "match": f"{home_team['name']} vs {away_team['name']}",
                "time": start.strftime("%I%p").lstrip("0").lower(),
                "teams": [home_team, away_team],
                "venue": venues[match_record["venue_slug"]],
                "match_number": match_record["match_number"],
                "match_url": f"/match/{match_record['slug']}/",
            }
        )

    page = {
        "title": guide["title"],
        "description": guide["description"],
        "canonical": guide["canonical"],
        "date_modified": guide["last_updated"],
    }
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": page["date_modified"],
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Watch Live",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "FAQPage",
                "@id": f"{page['canonical']}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in guide["faq"]
                ],
            },
        ],
    }
    rendered = template_environment().get_template("watch-live.html").render(
        page=page,
        guide=guide,
        official_broadcasts=official_broadcasts,
        opening_fixtures=opening_fixtures,
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "watch-live" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    build_homepage_watch_live(guide, opening_fixtures)
    print(
        f"Rendered {output.relative_to(ROOT)} with "
        f"{len(official_broadcasts)} official broadcast territories"
    )


def build_cpl_live_streaming() -> None:
    guide = load_json(ROOT / "data" / "cpl-live-streaming-guide.json")
    page = {
        "title": guide["title"],
        "description": guide["description"],
        "canonical": guide["canonical"],
        "date_published": guide["date_published"],
        "date_modified": guide["date_modified"],
    }
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "datePublished": page["date_published"],
                "dateModified": page["date_modified"],
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Watch Live",
                        "item": "https://cplseason.com/watch-live/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": "CPL 2026 Live Streaming Guide",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "FAQPage",
                "@id": f"{page['canonical']}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in guide["faq"]
                ],
            },
        ],
    }
    rendered = template_environment().get_template(
        "cpl-live-streaming.html"
    ).render(
        page=page,
        guide=guide,
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / guide["slug"] / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(
        f"Rendered {output.relative_to(ROOT)} with "
        f"{len(guide['regions'])} country and regional entries"
    )


def build_live_score() -> None:
    config = load_json(ROOT / "data" / "live-score.json")
    teams = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "teams").glob("*.json"))
    }
    venues = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }
    source_matches = sorted(
        (load_json(path) for path in (ROOT / "data" / "matches").glob("*.json")),
        key=lambda match: match["match_number"],
    )

    def decorate_fixture(source: dict) -> dict:
        match = dict(source)
        start = datetime.fromisoformat(match["start_iso"])
        home_team = teams.get(match.get("home_team_slug"))
        away_team = teams.get(match.get("away_team_slug"))
        venue = venues[match["venue_slug"]]
        hour = start.strftime("%I").lstrip("0")
        match.update(
            {
                "home_team": home_team,
                "away_team": away_team,
                "home_label": (
                    home_team["name"] if home_team else match["home_team_label"]
                ),
                "away_label": (
                    away_team["name"] if away_team else match["away_team_label"]
                ),
                "home_short": (
                    home_team["short_name"] if home_team else "TBC"
                ),
                "away_short": (
                    away_team["short_name"] if away_team else "TBC"
                ),
                "venue": venue,
                "date_label": (
                    f"{start.strftime('%a')} {start.day} {start.strftime('%b')}"
                ),
                "date_label_long": (
                    f"{start.strftime('%A')}, {start.day} "
                    f"{start.strftime('%B %Y')}"
                ),
                "time_label": (
                    f"{hour}:{start.strftime('%M')}{start.strftime('%p').lower()}"
                ),
                "url": f"/match/{match['slug']}/",
            }
        )
        return match

    matches = [decorate_fixture(match) for match in source_matches]
    focus = matches[0]
    upcoming = matches[:5]
    page = {
        "title": config["title"],
        "description": config["description"],
        "canonical": config["canonical"],
        "date_modified": config["last_updated"],
    }
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": page["date_modified"],
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
                "mainEntity": {"@id": f"{page['canonical']}#matches"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Live Score",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "ItemList",
                "@id": f"{page['canonical']}#matches",
                "name": "CPL 2026 live score and match centres",
                "numberOfItems": len(matches),
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": match["match_number"],
                        "url": f"https://cplseason.com{match['url']}",
                        "name": (
                            f"Match {match['match_number']}: "
                            f"{match['home_label']} vs {match['away_label']}"
                        ),
                    }
                    for match in matches
                ],
            },
            {
                "@type": "FAQPage",
                "@id": f"{page['canonical']}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in config["faq"]
                ],
            },
        ],
    }
    match_map = [
        {
            "matchNumber": match["match_number"],
            "url": match["url"],
            "startIso": match["start_iso"],
            "dateLabel": match["date_label"],
            "dateLabelLong": match["date_label_long"],
            "timeLabel": match["time_label"],
            "stage": match["stage"],
            "home": {
                "name": match["home_label"],
                "shortName": match["home_short"],
                "logo": match["home_team"]["logo"] if match["home_team"] else "",
                "url": (
                    f"/team/{match['home_team']['slug']}/"
                    if match["home_team"]
                    else ""
                ),
            },
            "away": {
                "name": match["away_label"],
                "shortName": match["away_short"],
                "logo": match["away_team"]["logo"] if match["away_team"] else "",
                "url": (
                    f"/team/{match['away_team']['slug']}/"
                    if match["away_team"]
                    else ""
                ),
            },
            "venue": match["venue"]["name"],
        }
        for match in matches
    ]
    rendered = template_environment().get_template("live-score.html").render(
        page=page,
        config=config,
        focus=focus,
        upcoming=upcoming,
        match_map_json=json.dumps(
            match_map, ensure_ascii=False, separators=(",", ":")
        ),
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "live-score" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)} with dynamic official score feed")


def build_cpl_history() -> None:
    """Render distinct CPL history, winners and team-success record pages."""
    history = load_json(ROOT / "data" / "cpl-history.json")
    teams = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "teams").glob("*.json"))
    }
    seasons = []
    for season in history["seasons"]:
        item = dict(season)
        item["team"] = teams.get(item.get("team_slug"))
        seasons.append(item)
    rankings = []
    for ranking in history["team_rankings"]:
        item = dict(ranking)
        item["team"] = teams.get(item.get("team_slug"))
        item["decided_matches"] = item["wins"] + item["losses"]
        item["final_conversion"] = round((item["titles"] / item["finals"]) * 100, 1)
        rankings.append(item)

    chasing_winners = {2013, 2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024, 2025}
    final_patterns = {
        "chasing_wins": sum(1 for season in seasons if season["year"] in chasing_winners),
        "defending_wins": sum(
            1 for season in seasons
            if season["status"] == "complete" and season["year"] not in chasing_winners
        ),
        "closest": "St Kitts & Nevis Patriots, final ball in 2021",
        "largest_wickets": "9 wickets, Jamaica in 2016 and Guyana in 2023",
        "largest_runs": "27 runs, Barbados in 2019",
    }

    pages = [
        {
            "kind": "history", "route": "cpl-history", "breadcrumb": "CPL History",
            "title": "CPL History: Every Season, Champion and Final",
            "description": "Explore CPL history from 2013 to 2026 with every champion, runner-up, final score, season story, franchise change and major tournament record.",
            "kicker": "The complete men's CPL archive · 2013–2026",
            "heading": "Caribbean Premier League<br><span>History</span>",
            "lede": "Every season, champion and final result, plus the records and franchise changes that shaped the Caribbean Premier League."
        },
        {
            "kind": "winners", "route": "cpl-winners-list", "breadcrumb": "CPL Winners List",
            "title": "CPL Winners List From 2013 to 2026",
            "description": "See the complete CPL winners list from 2013 to 2026, including every champion, runner-up, final score, winning margin and franchise title record.",
            "kicker": "Champions and runners-up · 2013–2026",
            "heading": "CPL Winners <span>List</span>",
            "lede": "A quick, accurate year-by-year table of Caribbean Premier League champions, runners-up and final results."
        },
        {
            "kind": "teams", "route": "most-successful-cpl-teams", "breadcrumb": "Most Successful CPL Teams",
            "title": "Most Successful CPL Teams of All Time",
            "description": "Rank the most successful CPL teams by titles, finals appearances and win percentage through 2025, with franchise-name continuity clearly explained.",
            "kicker": "All-time franchise rankings · through 2025",
            "heading": "Most Successful<br><span>CPL Teams</span>",
            "lede": "Championships decide the order. Finals appearances and win percentage reveal the wider record behind each CPL franchise."
        },
    ]
    completed = [season for season in seasons if season["status"] == "complete"]
    for page in pages:
        page["canonical"] = f"https://cplseason.com/{page['route']}/"
        page["date_modified"] = history["last_updated"]
        items = rankings if page["kind"] == "teams" else completed
        item_names = (
            [f"{team['name']}: {team['titles']} CPL titles" for team in rankings]
            if page["kind"] == "teams"
            else [f"{season['year']} CPL champion: {season['winner']}" for season in completed]
        )
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "CollectionPage", "@id": f"{page['canonical']}#webpage", "url": page["canonical"], "name": page["title"], "description": page["description"], "dateModified": page["date_modified"], "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"}, "mainEntity": {"@id": f"{page['canonical']}#list"}},
                {"@type": "ItemList", "@id": f"{page['canonical']}#list", "name": page["breadcrumb"], "numberOfItems": len(items), "itemListElement": [{"@type": "ListItem", "position": index, "name": name} for index, name in enumerate(item_names, start=1)]},
                {"@type": "BreadcrumbList", "@id": f"{page['canonical']}#breadcrumb", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://cplseason.com/"}, {"@type": "ListItem", "position": 2, "name": page["breadcrumb"], "item": page["canonical"]}]},
            ],
        }
        rendered = template_environment().get_template("cpl-history.html").render(
            page=page, history=history, seasons=seasons, rankings=rankings,
            final_patterns=final_patterns,
            schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
        )
        output = ROOT / page["route"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
        print(f"Rendered {output.relative_to(ROOT)}")


def build_match_spotlight_schedule() -> list[dict]:
    """Publish the compact schedule used by live homepage/footer spotlights."""
    venues = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }
    matches = sorted(
        (load_json(path) for path in (ROOT / "data" / "matches").glob("*.json")),
        key=lambda match: match["match_number"],
    )
    schedule = []
    for match in matches:
        start = datetime.fromisoformat(match["start_iso"])
        venue = venues[match["venue_slug"]]
        schedule.append(
            {
                "matchNumber": match["match_number"],
                "label": f"{start.strftime('%a')} {start.day} {start.strftime('%b')}",
                "startIso": match["start_iso"],
                "time": start.strftime("%I%p").lstrip("0").lower(),
                "home": match["home_team_label"],
                "away": match["away_team_label"],
                "venue": venue["name"],
                "venueShort": venue.get("short_name", venue["name"]),
                "url": f"/match/{match['slug']}/",
            }
        )
    output = ROOT / "static" / "match-spotlight.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(schedule, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"Rendered {output.relative_to(ROOT)} with {len(schedule)} matches")
    return schedule


def build_matches() -> None:
    teams = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "teams").glob("*.json"))
    }
    players = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "players").glob("*.json"))
    }
    venues = {
        path.stem: load_json(path)
        for path in sorted((ROOT / "data" / "venues").glob("*.json"))
    }
    head_to_head_records = load_json(ROOT / "data" / "head-to-head.json")
    template = template_environment().get_template("match.html")
    rendered_count = 0

    for source_path in sorted((ROOT / "data" / "matches").glob("*.json")):
        match = load_json(source_path)
        home_team = (
            dict(teams[match["home_team_slug"]])
            if match.get("home_team_slug")
            else None
        )
        away_team = (
            dict(teams[match["away_team_slug"]])
            if match.get("away_team_slug")
            else None
        )
        for team in (home_team, away_team):
            if team:
                team["players"] = [players[slug] for slug in team["roster"]]
        venue = venues[match["venue_slug"]]
        start = datetime.fromisoformat(match["start_iso"])
        utc_start = start.astimezone(timezone.utc)
        india_start = utc_start + timedelta(hours=5, minutes=30)
        local_hour = start.strftime("%I").lstrip("0")
        local_time_label = f"{local_hour}:{start.strftime('%M')}{start.strftime('%p').lower()}"
        utc_hour = utc_start.strftime("%I").lstrip("0")
        utc_time_label = f"{utc_hour}:{utc_start.strftime('%M')}{utc_start.strftime('%p').lower()}"
        india_hour = india_start.strftime("%I").lstrip("0")
        india_time_label = f"{india_hour}:{india_start.strftime('%M')}{india_start.strftime('%p').lower()}"
        utc_offset_hours = int(start.utcoffset().total_seconds() // 3600)
        utc_offset_label = f"UTC{utc_offset_hours:+d}".replace("-", "−")
        home_label = home_team["name"] if home_team else match["home_team_label"]
        away_label = away_team["name"] if away_team else match["away_team_label"]
        matchup_label = f"{home_label} vs {away_label}"
        fixture_label = (
            match["stage"]
            if match["stage"] != "League stage"
            else f"Match {match['match_number']}"
        )
        match.update(
            {
                "home_team": home_team,
                "away_team": away_team,
                "venue": venue,
                "home_label": home_label,
                "away_label": away_label,
                "matchup_label": matchup_label,
                "fixture_label": fixture_label,
                "date_label_short": f"{start.strftime('%a')} {start.day} {start.strftime('%b')}",
                "date_label_long": f"{start.strftime('%A')}, {start.day} {start.strftime('%B %Y')}",
                "local_time_label": local_time_label,
                "utc_time_label": utc_time_label,
                "india_time_label": india_time_label,
                "utc_offset_label": utc_offset_label,
                "utc_date_label": (
                    f"{utc_start.day} {utc_start.strftime('%b')}"
                    if utc_start.date() != start.date()
                    else None
                ),
                "india_date_label": (
                    f"{india_start.day} {india_start.strftime('%b')}"
                    if india_start.date() != start.date()
                    else None
                ),
            }
        )
        probable_source = match.get("probable_xi") or {
            "home": home_team.get("probable_xi", []) if home_team else [],
            "away": away_team.get("probable_xi", []) if away_team else [],
        }
        match["probable_xi"] = {
            "home": [players[slug] for slug in probable_source.get("home", []) if slug in players],
            "away": [players[slug] for slug in probable_source.get("away", []) if slug in players],
        }
        match["head_to_head"] = None
        match["first_meeting"] = False
        if home_team and away_team:
            pair_slugs = sorted([home_team["slug"], away_team["slug"]])
            pair_key = "|".join(pair_slugs)
            record = head_to_head_records.get(pair_key)
            if record:
                home_is_a = home_team["slug"] == pair_slugs[0]
                home_wins = record["team_a_wins"] if home_is_a else record["team_b_wins"]
                away_wins = record["team_b_wins"] if home_is_a else record["team_a_wins"]
                match["head_to_head"] = {
                    "matches": record["matches"],
                    "home_wins": home_wins,
                    "away_wins": away_wins,
                    "no_results": record["no_results"],
                    "through": "CPL 2025",
                    "scope": "all_time",
                    "summary": (
                        f"Across {record['matches']} CPL meetings through 2025, "
                        f"{home_label} have {home_wins} wins and {away_label} have {away_wins}."
                        + (f" {record['no_results']} match{'es' if record['no_results'] != 1 else ''} ended without a result." if record["no_results"] else "")
                    ),
                    "recent": record["recent"],
                }
            elif "jamaica-kingsmen" in pair_slugs:
                match["first_meeting"] = True
        match["prediction"] = match.get("prediction") or {
            "label": "Early match outlook",
            "headline": f"{home_label} vs {away_label}: key contest areas",
            "analysis": (
                f"The balance between {home_label}'s top order and {away_label}'s "
                f"bowling options should shape this game at {venue['name']}. Powerplay "
                "wickets, middle-overs control and the ability to finish the innings are "
                "the leading pre-match factors."
            ) if home_team and away_team else (
                "The playoff outlook will update when the qualifying teams and their route "
                "through the league stage are confirmed."
            ),
            "confidence": "Pre-match view",
            "factors": ["Powerplay wickets", "Middle-overs control", "Finishing depth", "Venue conditions"],
        }
        match["match_stats"] = [
            {"label": "Match", "value": f"{match['match_number']} of 39"},
            {"label": "Format", "value": "T20 · 20 overs"},
            {"label": "Venue capacity", "value": f"{venue['capacity']:,}"},
            {"label": "Stage", "value": match["stage"]},
        ]

        canonical = f"https://cplseason.com/match/{match['slug']}/"
        playoff_title_labels = {
            "Eliminator": "CPL Eliminator",
            "Qualifier 1": "CPL Qualifier 1",
            "Qualifier 2": "CPL Qualifier 2",
            "Final": "Championship Final",
        }
        title_matchup = (
            f"{SEO_SHORT_NAMES[home_team['slug']]} vs "
            f"{SEO_SHORT_NAMES[away_team['slug']]}"
            if home_team and away_team
            else playoff_title_labels.get(fixture_label, fixture_label)
        )
        meta_description = (
            f"Follow {matchup_label} live score, toss, playing XIs, "
            "match updates and result for "
            f"CPL 2026 Match {match['match_number']} at {venue['name']}."
        )
        if len(meta_description) > 165:
            meta_description = meta_description.replace("playing XIs, ", "")
        if len(meta_description) < 145:
            meta_description = meta_description.replace(
                "match updates and result", "ball-by-ball updates, squads and result"
            )
        page = {
            "title": (
                f"{title_matchup}: CPL 2026 Match {match['match_number']} "
                "Live Score & Result"
            ),
            "description": meta_description,
            "canonical": canonical,
        }
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebPage",
                    "@id": f"{canonical}#webpage",
                    "url": canonical,
                    "name": page["title"],
                    "description": page["description"],
                    "dateModified": match["last_updated"],
                    "mainEntity": {"@id": f"{canonical}#match"},
                    "breadcrumb": {"@id": f"{canonical}#breadcrumb"},
                },
                {
                    "@type": "SportsEvent",
                    "@id": f"{canonical}#match",
                    "name": (
                        f"{matchup_label}, "
                        f"CPL 2026 Match {match['match_number']}"
                    ),
                    "sport": "Cricket",
                    "startDate": match["start_iso"],
                    "eventStatus": "https://schema.org/EventScheduled",
                    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                    "homeTeam": (
                        {
                            "@type": "SportsTeam",
                            "name": home_team["name"],
                            "url": f"https://cplseason.com/team/{home_team['slug']}/",
                        }
                        if home_team
                        else {
                            "@type": "SportsTeam",
                            "name": match["home_team_label"],
                        }
                    ),
                    "awayTeam": (
                        {
                            "@type": "SportsTeam",
                            "name": away_team["name"],
                            "url": f"https://cplseason.com/team/{away_team['slug']}/",
                        }
                        if away_team
                        else {
                            "@type": "SportsTeam",
                            "name": match["away_team_label"],
                        }
                    ),
                    "location": {
                        "@type": "StadiumOrArena",
                        "name": venue["name"],
                        "url": f"https://cplseason.com/venue/{venue['slug']}/",
                        "address": {
                            "@type": "PostalAddress",
                            "addressLocality": venue["city"],
                            "addressCountry": venue["territory"],
                        },
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{canonical}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://cplseason.com/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Schedule",
                            "item": "https://cplseason.com/schedule/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": f"Match {match['match_number']}",
                            "item": canonical,
                        },
                    ],
                },
            ],
        }
        rendered = template.render(
            page=page,
            match=match,
            schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
        )
        output = ROOT / "match" / match["slug"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
        rendered_count += 1

    print(f"Rendered {rendered_count} match pages")


def link_schedule_matches() -> None:
    """Attach every schedule card to its canonical match-centre page."""
    schedule_path = ROOT / "schedule" / "index.html"
    html = schedule_path.read_text(encoding="utf-8")
    matches = sorted(
        (
            load_json(path)
            for path in (ROOT / "data" / "matches").glob("*.json")
        ),
        key=lambda item: item["match_number"],
    )
    card_pattern = re.compile(
        r"(<article\b[^>]*\bdata-schedule-match\b[^>]*>)(.*?)(</article>)",
        re.DOTALL,
    )
    cards = list(card_pattern.finditer(html))
    if len(cards) != len(matches):
        raise ValueError(
            f"Schedule has {len(cards)} match cards; expected {len(matches)}"
        )
    match_iterator = iter(matches)

    def attach_link(card_match: re.Match[str]) -> str:
        match = next(match_iterator)
        opening, body, closing = card_match.groups()
        match_url = f"/match/{match['slug']}/"
        opening = re.sub(r'\sdata-match-url="[^"]*"', "", opening)
        opening = opening[:-1].rstrip() + f'\n    data-match-url="{match_url}"\n  >'
        body = re.sub(
            r'\s*<a class="schedule-match-centre-cta"[^>]*>.*?</a>\s*$',
            "",
            body,
            flags=re.DOTALL,
        )
        body = body.rstrip()
        cta = (
            f'\n    <a class="schedule-match-centre-cta" href="{match_url}">'
            f'<span>Match {match["match_number"]:02d}</span>'
            "Open match centre <b>→</b></a>\n  "
        )
        return opening + body + cta + closing

    schedule_path.write_text(
        card_pattern.sub(attach_link, html),
        encoding="utf-8",
    )
    print("Linked all 39 schedule cards to match centre pages")


def normalize_schedule_schema() -> None:
    """Keep the schedule index lean and point its fixture list at match pages."""
    schedule_path = ROOT / "schedule" / "index.html"
    html = schedule_path.read_text(encoding="utf-8")
    matches = sorted(
        (
            load_json(path)
            for path in (ROOT / "data" / "matches").glob("*.json")
        ),
        key=lambda item: item["match_number"],
    )
    schema_pattern = re.compile(
        r'(<script type="application/ld\+json">)(.*?)(</script>)',
        re.DOTALL,
    )
    updated_schema = False

    def normalize(match: re.Match[str]) -> str:
        nonlocal updated_schema
        try:
            schema = json.loads(match.group(2))
        except json.JSONDecodeError:
            return match.group(0)
        graph = schema.get("@graph") if isinstance(schema, dict) else None
        if not isinstance(graph, list):
            return match.group(0)

        schema["@graph"] = [
            node
            for node in graph
            if not (
                isinstance(node, dict)
                and node.get("@type") in {"Event", "SportsEvent"}
            )
        ]
        fixture_list = next(
            (
                node
                for node in schema["@graph"]
                if isinstance(node, dict)
                and node.get("@type") == "ItemList"
                and node.get("numberOfItems") == len(matches)
            ),
            None,
        )
        if fixture_list is None:
            return match.group(0)

        items = fixture_list.get("itemListElement", [])
        if len(items) != len(matches):
            raise ValueError(
                "Schedule schema fixture count does not match match data"
            )
        for item, fixture in zip(items, matches):
            item["url"] = f"https://cplseason.com/match/{fixture['slug']}/"

        updated_schema = True
        compact = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
        return f"{match.group(1)}{compact}{match.group(3)}"

    html = schema_pattern.sub(normalize, html)
    if not updated_schema:
        raise ValueError("Could not locate the 39-match schedule ItemList schema")
    schedule_path.write_text(html, encoding="utf-8")
    print("Normalized schedule schema and removed duplicate event entities")


def build_venues() -> None:
    venues = [
        load_json(ROOT / "data" / "venues" / f"{slug}.json")
        for slug in VENUE_ORDER
    ]
    page = {
        "title": "CPL 2026 Venues: Fixtures, Cities and Stadiums Guide",
        "description": (
            "See the eight grounds hosting CPL 2026, with match dates, host "
            "cities, stadium photos, capacities and a fixture list for every venue."
        ),
        "canonical": "https://cplseason.com/venues/",
    }
    faq = [
        {
            "question": "Where does CPL 2026 begin?",
            "answer": (
                "Arnos Vale Stadium in St Vincent hosts the opening three "
                "matches from 7 to 9 August."
            ),
        },
        {
            "question": "Where is the CPL 2026 final?",
            "answer": (
                "Kensington Oval in Bridgetown hosts the final on 20 September "
                "and all four knockout matches."
            ),
        },
        {
            "question": "Which ground has the most CPL 2026 matches?",
            "answer": (
                "Kensington Oval has nine scheduled matches: five league "
                "fixtures and four knockout games."
            ),
        },
    ]
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{page['canonical']}#webpage",
                "url": page["canonical"],
                "name": page["title"],
                "description": page["description"],
                "dateModified": "2026-07-26",
                "breadcrumb": {"@id": f"{page['canonical']}#breadcrumb"},
                "mainEntity": {"@id": f"{page['canonical']}#venues"},
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{page['canonical']}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://cplseason.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Venues",
                        "item": page["canonical"],
                    },
                ],
            },
            {
                "@type": "ItemList",
                "@id": f"{page['canonical']}#venues",
                "name": "CPL 2026 venues",
                "numberOfItems": len(venues),
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "name": venue["name"],
                        "url": (
                            "https://cplseason.com/venue/"
                            f"{venue['slug']}/"
                        ),
                        "item": {
                            "@type": "Place",
                            "name": venue["name"],
                            "url": (
                                "https://cplseason.com/venue/"
                                f"{venue['slug']}/"
                            ),
                            "address": {
                                "@type": "PostalAddress",
                                "addressLocality": venue["city"],
                                "addressCountry": venue["territory"],
                            },
                            "maximumAttendeeCapacity": venue["capacity"],
                            "image": f"https://cplseason.com{venue['image']}",
                        },
                    }
                    for index, venue in enumerate(venues, start=1)
                ],
            },
            {
                "@type": "FAQPage",
                "@id": f"{page['canonical']}#faq",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["question"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["answer"],
                        },
                    }
                    for item in faq
                ],
            },
        ],
    }
    rendered = template_environment().get_template("venues.html").render(
        page=page,
        venues=venues,
        schema_json=json.dumps(schema, ensure_ascii=False, separators=(",", ":")),
    )
    output = ROOT / "venues" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered + "\n", encoding="utf-8")
    print(f"Rendered {output.relative_to(ROOT)} with {len(venues)} venues")


def build_venue_profiles() -> None:
    venues = [
        load_json(ROOT / "data" / "venues" / f"{slug}.json")
        for slug in VENUE_ORDER
    ]
    match_urls = {
        (match["date"], match["venue_slug"]): f"/match/{match['slug']}/"
        for match in (
            load_json(path)
            for path in (ROOT / "data" / "matches").glob("*.json")
        )
    }
    for venue in venues:
        for fixture in venue["fixtures"]:
            key = (fixture["date"], venue["slug"])
            if key not in match_urls:
                raise ValueError(
                    f"Missing match page for {venue['slug']} on {fixture['date']}"
                )
            fixture["match_url"] = match_urls[key]
    env = template_environment()
    template = env.get_template("venue.html")
    for index, venue in enumerate(venues):
        canonical = f"https://cplseason.com/venue/{venue['slug']}/"
        page = {
            "title": f"{venue['name']}: CPL 2026 Matches and Ground Guide",
            "description": (
                f"{venue['name']} in {venue['city']} hosts {venue['matches']} "
                "CPL 2026 matches. See the fixture list, ground history, "
                "capacity, wicket ends and stadium information."
            ),
            "canonical": canonical,
        }
        faq = [
            {
                "question": f"Where is {venue['name']}?",
                "answer": (
                    f"{venue['name']} is in {venue['city']}, "
                    f"{venue['territory']}."
                ),
            },
            {
                "question": (
                    f"How many CPL 2026 matches are scheduled at {venue['name']}?"
                ),
                "answer": (
                    f"{venue['matches']} CPL 2026 matches are scheduled at "
                    f"{venue['name']} from {venue['date_window']}."
                ),
            },
            {
                "question": f"What is the capacity of {venue['name']}?",
                "answer": (
                    f"The published reference capacity is "
                    f"{venue['capacity']:,}. Event configuration and available "
                    "ticket inventory may differ."
                ),
            },
        ]
        place_schema = {
            "@type": "StadiumOrArena",
            "@id": f"{canonical}#venue",
            "name": venue["name"],
            "url": canonical,
            "image": f"https://cplseason.com{venue['image']}",
            "description": venue["tagline"],
            "address": {
                "@type": "PostalAddress",
                "addressLocality": venue["city"],
                "addressCountry": venue["territory"],
            },
            "maximumAttendeeCapacity": venue["capacity"],
        }
        schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "ProfilePage",
                    "@id": f"{canonical}#webpage",
                    "url": canonical,
                    "name": page["title"],
                    "description": page["description"],
                    "dateModified": venue["last_updated"],
                    "mainEntity": {"@id": f"{canonical}#venue"},
                    "breadcrumb": {"@id": f"{canonical}#breadcrumb"},
                },
                place_schema,
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{canonical}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://cplseason.com/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Venues",
                            "item": "https://cplseason.com/venues/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": venue["name"],
                            "item": canonical,
                        },
                    ],
                },
                {
                    "@type": "FAQPage",
                    "@id": f"{canonical}#faq",
                    "mainEntity": [
                        {
                            "@type": "Question",
                            "name": item["question"],
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": item["answer"],
                            },
                        }
                        for item in faq
                    ],
                },
            ],
        }
        related_venues = [
            venues[(index + offset) % len(venues)]
            for offset in (1, 2, 3)
        ]
        rendered = template.render(
            page=page,
            venue=venue,
            venue_number=index + 1,
            related_venues=related_venues,
            faq=faq,
            schema_json=json.dumps(
                schema, ensure_ascii=False, separators=(",", ":")
            ),
        )
        output = ROOT / "venue" / venue["slug"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")

    print(f"Rendered {len(venues)} venue profile pages")


def sync_shared_footer() -> None:
    """Keep shared site chrome consistent and enforce one floating top button."""
    build_match_spotlight_schedule()
    shared_footer = template_environment().get_template("partials/footer.html").render().strip()
    footer_pattern = re.compile(
        r'<footer class="site-footer(?: site-footer-pro)?".*?</footer>',
        re.DOTALL,
    )
    back_to_top_pattern = re.compile(
        r'\s*<button class="back-to-top"[^>]*>.*?</button>',
        re.DOTALL,
    )
    external_anchor_pattern = re.compile(
        r'<a\b(?=[^>]*\bhref=["\']https?://(?!'
        r'(?:(?:www\.)?cplseason\.com|(?:www\.)?cplt20\.com|cpl-cpl\.shop\.secutix\.com|(?:www\.)?willow\.tv|(?:www\.)?rushcaribbean\.co)'
        r'(?:/|["\'])))[^>]*>(.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    css_pattern = re.compile(r'/static/css/site\.css\?v=[^"&<]+')
    js_pattern = re.compile(r'/static/js/site\.js\?v=[^"&<]+')
    adsense_script_pattern = re.compile(
        r'\s*<script\b[^>]*\bsrc=["\']'
        r'https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js'
        r'\?client=ca-pub-\d+["\'][^>]*>\s*</script>',
        re.IGNORECASE,
    )
    adsense_script = (
        '  <script async '
        'src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
        '?client=ca-pub-0093554134829472" '
        'crossorigin="anonymous"></script>'
    )
    synchronized = 0

    for html_path in sorted(ROOT.rglob("*.html")):
        if any(part in {".git", ".vercel", "output", "templates"} for part in html_path.parts):
            continue
        if html_path.name.startswith("google") and html_path.parent == ROOT:
            continue

        source = html_path.read_text(encoding="utf-8")
        source = back_to_top_pattern.sub("", source)
        updated, replacements = footer_pattern.subn(shared_footer, source, count=1)
        if replacements != 1:
            raise ValueError(f"Expected one site footer in {html_path.relative_to(ROOT)}")

        def unlink_external(match: re.Match[str]) -> str:
            content = re.sub(
                r'\s*<span[^>]*>\s*↗\s*</span>',
                "",
                match.group(1),
                flags=re.IGNORECASE,
            )
            return content.replace(" ↗", "")

        updated = external_anchor_pattern.sub(unlink_external, updated)
        if html_path == ROOT / "news" / "cpl-step-challenge-2026-how-to-join" / "index.html":
            site_css_url = "/static/css/site.css?v=20260801challengecolors"
        elif html_path == ROOT / "teams" / "index.html":
            site_css_url = "/static/css/site.css?v=20260804teams16"
        elif html_path.parent.name in {
            "cpl-history",
            "cpl-winners-list",
            "most-successful-cpl-teams",
        }:
            site_css_url = "/static/css/site.css?v=20260805records"
        else:
            site_css_url = "/static/css/site.css?v=20260731breadcrumbs"
        updated = css_pattern.sub(site_css_url, updated)
        site_js_url = (
            "/static/js/site.js?v=20260805playersd"
            if html_path == ROOT / "players" / "index.html"
            else "/static/js/site.js?v=20260729ms"
        )
        updated = js_pattern.sub(site_js_url, updated)
        updated = adsense_script_pattern.sub("", updated)
        if "</head>" not in updated:
            raise ValueError(f"Expected </head> in {html_path.relative_to(ROOT)}")
        updated = updated.replace("</head>", f"{adsense_script}\n</head>", 1)
        if updated.count("ca-pub-0093554134829472") != 1:
            raise ValueError(
                f"Expected one AdSense script in {html_path.relative_to(ROOT)}"
            )
        if len(re.findall(r'class="back-to-top"', updated)) != 1:
            raise ValueError(
                f"Expected one back-to-top button in {html_path.relative_to(ROOT)}"
            )
        html_path.write_text(updated, encoding="utf-8")
        synchronized += 1

    print(f"Synchronized the shared footer across {synchronized} HTML pages.")


if __name__ == "__main__":
    build_home_player_pool()
    build_contact_page()
    build_privacy_policy()
    build_terms_of_service()
    build_authors()
    build_squads()
    build_players()
    build_player_profiles()
    build_teams()
    build_team_profiles()
    build_points_table()
    build_watch_live()
    build_cpl_live_streaming()
    build_live_score()
    build_cpl_history()
    build_matches()
    link_schedule_matches()
    normalize_schedule_schema()
    build_news()
    build_venues()
    build_venue_profiles()
    sync_shared_footer()
