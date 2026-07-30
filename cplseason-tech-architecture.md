# CPL Season Technical Architecture

The site uses static HTML, CSS and vanilla JavaScript.

## Source and build

- `data/teams/*.json` — one team record per file, including the 2026 roster.
- `data/players/*.json` — one player record per file.
- `data/venues/*.json` — one host-ground record per file, including image
  attribution and the CPL 2026 match allocation.
- `data/matches/*.json` — one match record per file, including canonical team
  and venue references plus the official match-centre identifier.
- `data/live-score.json` — metadata, refresh policy and trust copy for the
  canonical `/live-score/` matchday hub.
- `data/broadcast-guide.json` — verified regional viewing status, time
  conversions, source links and FAQs for `/watch-live/`.
- `data/news/*.json` — one source record per CPL news article, including dates,
  original editorial sections, internal entity references and image metadata.
- `templates/players.html` — Jinja template for `/players/`.
- `templates/squads.html` — Jinja template for `/squads/`.
- `templates/teams.html` — Jinja template for the `/teams/` franchise directory.
- `templates/team.html` — shared Jinja template for every `/team/[slug]/` franchise profile.
- `templates/points-table.html` — Jinja template for the pre-season and live `/points-table/`.
- `static/js/standings.js` — polls the official CPL MCPRO competition ladder
  every 30 seconds, maps official team IDs to canonical team records and updates
  the rendered standings only when a complete seven-team ladder is available.
- `templates/watch-live.html` — Jinja template for the legal viewing guide.
- `templates/player.html` — shared Jinja template for every `/player/[slug]/` page.
- `templates/match.html` — shared Jinja template for every `/match/[slug]/` page.
- `templates/live-score.html` — Jinja template for the dynamic `/live-score/` hub.
- `static/js/live-score.js` — polls the local live-score proxy, updates the
  current score panel and preserves the last verified state on feed errors.
- `api/cpl-live-score.js` — server-side normalized proxy for the official CPL
  MCPRO schedule and match-summary feeds; the client key is never placed in the
  live-score page.
- `templates/venues.html` — Jinja template for `/venues/`.
- `templates/news.html` — Jinja template for the `/news/` story index.
- `templates/news-article.html` — shared Jinja template for every
  `/news/[slug]/` story.
- `templates/partials/footer.html` — single source for the site-wide footer; the
  build synchronizes it across generated and retained static HTML pages.
- `build.py` — renders source data into the deployable players, squads, teams,
  individual player and team profiles, venues, news index and news articles.
- `scripts/validate_site.py` — validates roster data, canonical player/team links,
  image references, and the generated squads page.

`players/index.html`, `squads/index.html`, `teams/index.html`,
`points-table/index.html`, `live-score/index.html`, `watch-live/index.html`, `venues/index.html`,
every `player/*/index.html`, every `team/*/index.html`, and every
`venue/*/index.html`, `match/*/index.html` and `news/*/index.html` file are
generated. Do not edit them directly.

## Data provenance

The CPL 2026 squad membership is checked against the Wikipedia 2026 Caribbean
Premier League squads table, which cites the CPL local draft announcement and
ESPNcricinfo's overseas-signing update. Squad category labels are retained from
the CPL acquisition framework and existing verified local data.

Missing player portraits use initials. An image is only attached when the local
asset is already verified for that player.

## Live standings

The static points-table HTML is a safe pre-season fallback. In the browser,
`static/js/standings.js` requests the official CPL 2026 ladder from
`api.mcpro.cricket`, using the public CPL match-centre client identifier. Empty,
partial or unavailable responses never create a ranking: the last confirmed
table remains visible until a complete official ladder is returned.

## Live score hub

The live-score HTML is a confirmed-fixture fallback, not a frozen score page.
`static/js/live-score.js` requests `/api/cpl-live-score` on load, every 15
seconds while visible and whenever the visitor presses refresh. The proxy
selects the live match when one is in progress, otherwise the next scheduled
match or latest completed match, then normalizes official summary scores. Empty,
invalid or unavailable responses leave the last verified browser state intact.
