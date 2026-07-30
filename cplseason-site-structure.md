# CPL Season Site Structure

This repository is the isolated static build for `cplseason.com`.

## Canonical routes

- `/` — tournament home
- `/schedule/`, `/live-score/`, `/points-table/`, `/teams/`, `/players/`, `/squads/`, `/venues/`, `/watch-live/`, `/news/`
- `/team/[slug]/` — one canonical page per CPL team
- `/player/[slug]/` — one canonical page per player
- `/venue/[slug]/` — one canonical page per venue
- `/match/[slug]/` — one canonical page per CPL fixture
- `/news/[slug]/` — one canonical page per article

The players and squads collections are generated from `data/teams/*.json` and
`data/players/*.json`. Both collections must link to every included team and
player page. Existing canonical slugs are preserved when a source uses a
spelling variant.

The venues collection is generated from `data/venues/*.json` and must link to
all eight canonical `/venue/[slug]/` pages.

The points table is generated from the canonical team records. Before the
opening match it must remain explicitly unranked with zero results; live
standings may only be populated from confirmed match data.

Match pages are generated from `data/matches/*.json`. Each match must resolve
both teams and its venue, and must use a match-specific official data endpoint
for live scoring rather than invented or manually simulated updates.

The `/live-score/` matchday hub is generated from `data/live-score.json` plus
the canonical match, team and venue records. Its visible score state must poll
the server-side `/api/cpl-live-score` proxy, retain the last verified state when
the official feed is unavailable and never manufacture placeholder scores.

The Watch Live guide is generated from `data/broadcast-guide.json`. A region
may be marked confirmed only when a current CPL or broadcaster-owned source
supports the 2026 viewing route. Historical rights lists remain context, not
current confirmation.
