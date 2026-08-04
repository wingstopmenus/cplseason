# CPL Season authority audit and roadmap

Audit date: 4 August 2026  
Site: https://cplseason.com/  
Scope: repository inventory, generated HTML, metadata, structured data, sitemap eligibility, internal links and topical coverage.

## Executive summary

CPL Season already has a strong entity-led foundation. The local validator passes 227 HTML pages with no broken internal links or orphan pages after the first authority-hub implementation. The site contains all 39 men's CPL 2026 match centres, 123 player profiles, seven current team profiles, eight venue guides and 28 news stories.

The main weakness is not missing 2026 fixture coverage. It is the lack of evergreen tournament-history and records clusters, plus some metadata that is longer or shorter than the editorial target. Creating alternate versions of existing hubs would split relevance and create duplicate intent. Existing canonical URLs should therefore be improved, not replaced.

Top priorities:

1. Preserve and strengthen the existing `/schedule/`, `/teams/`, `/team/`, `/squads/`, `/watch-live/`, `/live-score/`, `/points-table/` and `/match/` routes.
2. Build evergreen history and records coverage from verified season data.
3. Convert match centres from pre-match to live and post-match states using structured data, without publishing invented scores, XIs or predictions.
4. Improve author pages and short news items where unique editorial value is limited.
5. Use Search Console query and page data before expanding the long-tail publishing plan.

## Existing inventory

| Page type | Canonical pattern | Count | Status |
|---|---|---:|---|
| Homepage | `/` | 1 | Strong hub |
| Schedule | `/schedule/` | 1 | Complete 39-match schedule |
| Live score | `/live-score/` | 1 | Dynamic match-status hub |
| Match centres | `/match/{slug}/` | 39 | Reusable dynamic template |
| Points table | `/points-table/` | 1 | Dynamic table, safe pre-season state |
| Teams | `/teams/` | 1 | Complete directory |
| Team profiles | `/team/{slug}/` | 7 | Complete current-franchise pages |
| Squads | `/squads/` | 1 | Complete 123-player squad hub |
| Players | `/players/` | 1 | Complete directory |
| Player profiles | `/player/{slug}/` | 123 | Complete profile set |
| Venues | `/venues/` | 1 | Complete host-ground directory |
| Venue profiles | `/venue/{slug}/` | 8 | Complete venue set |
| Viewing guide | `/watch-live/` | 1 | Country and regional guide |
| News | `/news/` | 1 | Complete news hub |
| News articles | `/news/{slug}/` | 28 | Mixed news and evergreen guides |
| Authors | `/authors/`, `/authors/{slug}/` | 6 | Present; four profiles are thin |
| CPL history | `/cpl-history/` | 1 | Added in this implementation |

## Technical findings

### Passed controls

- One self-referencing canonical was found on every audited HTML page.
- Every audited page had one H1, a title and a meta description.
- No duplicate title or canonical was found in the generated inventory.
- The generated link graph had no broken internal links and no orphan pages.
- Match pages use `SportsEvent`; players use `Person` and `ProfilePage`; teams use `SportsTeam`; venues use `StadiumOrArena`; news uses `NewsArticle`.
- Breadcrumb structured data is present across generated page types.
- Sitemap generation admits only canonical, indexable routes and assigns meaningful `lastmod` values.
- News images are WebP and the repository validator enforces the news-image contract.

### Findings requiring work

| Priority | Finding | Evidence | Recommended action |
|---|---|---|---|
| High | Evergreen history and records coverage was absent | No history, winners or records route in the baseline sitemap | Start with one canonical history/winners hub; expand only when each records page has verified data and unique intent |
| High | Match titles were too long | 39 matchup titles included full franchise names and exceeded common SERP display lengths | Use concise team identities in titles while keeping full names in H1, copy and schema |
| High | Results do not yet have a dedicated useful state | Tournament had not started at audit time | Add a results view when completed match data exists; do not index an empty placeholder |
| Completed | Author trust content needed more depth | Four profiles were under 250 visible words | Added a visible sourcing, corrections and update-policy section; all five profiles now exceed 250 words |
| Partly completed | Metadata length varied across generated page types | Player profiles and several author/news pages were outside the editorial target | All 123 player titles now measure 52–60 characters and descriptions 153–160; remaining editorial pages should be rewritten individually rather than mechanically padded |
| Medium | Homepage title is 67 characters | Inventory sweep | Shorten only after checking Search Console CTR and current query mix |
| Medium | Header navigation has ten links | Template inspection | Keep key live-season paths visible; group secondary routes only after mobile interaction testing |
| Medium | Historical claims are distributed across team data | Team JSON contains title years and name-change context | Create a single history dataset as the source of truth and validate team title totals against it |
| Low | Results, H2H and predictions are named as desired clusters but have no source model | No dedicated structured datasets | Define data contracts before page generation; no speculative or swapped-variable pages |

## Canonical URL decisions

| Requested concept | Canonical decision | Reason |
|---|---|---|
| `/cpl-2026-schedule/` | Keep `/schedule/` | Existing complete schedule already owns the intent |
| `/cpl-2026-teams/` | Keep `/teams/` | Existing team directory and seven profiles are complete |
| `/teams/{slug}/` | Keep `/team/{slug}/` | Changing a working entity pattern adds redirects and risk without user value |
| `/cpl-2026-squads/` | Keep `/squads/` | Existing page is complete and well linked |
| `/cpl-2026-live-streaming/` | Keep `/watch-live/` | Existing regional viewing guide owns the intent |
| `/cpl/{match}/` | Keep `/match/{slug}/` | Thirty-nine match centres already use this canonical structure |
| Winners and history | Use `/cpl-history/` | One useful evergreen hub avoids overlapping winners/history pages |
| Results | Reserve `/results/` | Publish when verified completed-match data exists |
| Records | Reserve `/cpl-records/` | Requires a verified structured records dataset |
| Predictions | Do not mass-generate | Each prediction needs named human analysis, evidence, timestamp and clear uncertainty |

## Target architecture

```text
Homepage (/)
├── 2026 tournament
│   ├── Schedule (/schedule/)
│   ├── Live score (/live-score/)
│   ├── Points table (/points-table/)
│   ├── Results (/results/) [publish after verified results exist]
│   └── Match centres (/match/{slug}/)
├── Teams (/teams/)
│   ├── Team profile (/team/{slug}/)
│   └── Squads (/squads/)
├── Players (/players/)
│   └── Player profile (/player/{slug}/)
├── Venues (/venues/)
│   └── Venue guide (/venue/{slug}/)
├── Coverage
│   ├── Watch live (/watch-live/)
│   └── News (/news/)
└── History (/cpl-history/)
    ├── Records (/cpl-records/) [after data verification]
    └── Season archive (/cpl-history/{year}/) [only for complete season packages]
```

## Internal-linking rules

- Schedule cards link to both team entities, venue entities and the match centre.
- Match centres link to the schedule, both teams, both squads through player profiles, the venue, live score and viewing guide where relevant.
- Team pages link to every current player, team fixtures, venue, squads and the history hub when honours are mentioned.
- Player pages link to the current team and related squad members; editorial links should be added only when the player is materially discussed.
- News stories link contextually to teams, players, venues, schedule, tickets or viewing guides. Avoid generic “click here” anchors.
- History pages link to current franchise profiles but keep defunct and replacement franchises clearly separated.
- Every new hub must be linked from at least one global or high-level section before entering the XML sitemap.

## Structured-data policy

- Use schema that matches visible content exactly.
- Keep `SportsEvent` on individual match pages, not duplicated across the schedule hub.
- Change `eventStatus` and result fields only when the same state is visible on the page.
- Use `NewsArticle` only for editorial news; use `Article` or `WebPage` for evergreen guides.
- Use `FAQPage` only when the same questions and answers are visible. Rich-result display is not guaranteed.
- Keep `Organization`, `WebSite` and publisher identities consistent.
- Do not add invented aggregate ratings, attendance, score, player statistics or “official” claims.

## 30-day publishing and implementation plan

### Days 1–7: foundation and opening-week readiness

1. Publish and internally link the CPL history/winners hub.
2. Finish the metadata generator sweep, beginning with match and player templates.
3. Add a data-state test for scheduled, live, innings break, completed, abandoned and no-result matches.
4. Review the expanded author standards and keep bylines aligned with each writer's actual coverage desk.
5. Build a Search Console baseline dashboard: indexed pages, clicks, impressions, CTR and queries by page type.
6. Prepare opening-match preview and match-day update checklists.
7. Verify all broadcast rows, ticket links and opening-week start times against first-party sources.

### Days 8–14: match coverage and useful long-tail pages

1. Publish human-edited opening-week previews tied to existing match centres.
2. Add completed-match rendering and create `/results/` once the first verified result exists.
3. Publish venue-local-time and international-time explainers only where query data supports them.
4. Add factual team-form modules after at least two matches, with sample size shown.
5. Refresh player pages when confirmed XIs create real participation data.
6. Add “last five completed matches” links to team pages once sufficient results exist.
7. Review live pages on mobile after real feed states are available.

### Days 15–21: records and history depth

1. Assemble a sourced records dataset with season, player, team and match provenance.
2. Publish `/cpl-records/` only after fact review and schema validation.
3. Create the first complete season archive for the season with the best verified dataset.
4. Publish one original tactical analysis based on visible match evidence.
5. Add cross-links between record holders and player profiles.
6. Add franchise lineage blocks to affected team/history pages.
7. Audit index coverage and canonical selection after the new hub is crawled.

### Days 22–30: consolidation and distribution

1. Refresh the ten pages with the highest impressions and weakest CTR.
2. Consolidate or noindex any new page that cannot provide unique value.
3. Publish one original data story suitable for journalist citation.
4. Prepare a weekly fixtures-and-results email product with explicit consent.
5. Pitch the original data story to Caribbean sports desks and team communities.
6. Review Core Web Vitals field data and fix the largest template-level bottleneck.
7. Update the sitemap, content inventory, change log and next-month editorial queue.
8. Review revenue by page type before adding further ad density.
9. Create a Discover image and headline QA checklist.

## 100 article and page ideas

These are a research backlog, not an instruction to publish 100 thin pages. Each item must pass source, search-intent, uniqueness and internal-link checks.

### Schedule, fixtures and match planning

1. CPL 2026 schedule: complete fixture list and local start times
2. CPL 2026 schedule in Pakistan time
3. CPL 2026 schedule in India time
4. CPL 2026 schedule in UK time
5. CPL 2026 schedule in US and Canada time zones
6. CPL 2026 opening match guide
7. CPL 2026 playoff schedule explained
8. CPL 2026 final date, time and venue guide
9. CPL 2026 double-header dates
10. How to add the CPL 2026 schedule to your calendar
11. CPL 2026 fixtures by team
12. CPL 2026 fixtures by venue
13. CPL 2026 rest days and travel schedule
14. CPL 2026 home-match blocks by franchise
15. CPL 2026 schedule changes tracker

### Teams and squads

16. Jamaica Kingsmen 2026 squad: roles and balance
17. Antigua & Barbuda Falcons 2026 squad: roles and balance
18. Barbados Tridents 2026 squad: roles and balance
19. Guyana Amazon Warriors 2026 squad: roles and balance
20. Saint Lucia Kings 2026 squad: roles and balance
21. St Kitts & Nevis Patriots 2026 squad: roles and balance
22. Trinbago Knight Riders 2026 squad: roles and balance
23. Every CPL 2026 captain and leadership group
24. Every CPL 2026 wicketkeeper
25. CPL 2026 overseas players by team
26. CPL 2026 replacement players tracker
27. CPL 2026 youngest players
28. CPL 2026 most experienced players
29. CPL 2026 uncapped Caribbean players to watch
30. How the CPL squad construction rules work

### Players

31. CPL 2026 leading run scorers tracker
32. CPL 2026 leading wicket takers tracker
33. CPL 2026 highest individual scores
34. CPL 2026 best bowling figures
35. CPL 2026 most sixes
36. CPL 2026 best strike rates with minimum-innings rule
37. CPL 2026 best economy rates with minimum-overs rule
38. CPL 2026 most catches
39. CPL 2026 player of the match list
40. CPL 2026 player availability tracker
41. CPL 2026 debutants
42. CPL 2026 returning players
43. West Indies players in CPL 2026
44. Pakistan players in CPL 2026
45. South Africa players in CPL 2026

### Match coverage

46. Opening match preview: Kingsmen vs Falcons
47. Opening match result and key moments
48. CPL 2026 match results by date
49. CPL 2026 completed scorecards index
50. Today's CPL match: teams, time, venue and coverage
51. Tomorrow's CPL match: fixture and start time
52. CPL 2026 toss results tracker
53. CPL 2026 playing XIs tracker
54. CPL 2026 rain and no-result tracker
55. CPL 2026 super overs and tied matches
56. CPL 2026 biggest wins by runs
57. CPL 2026 biggest wins by wickets
58. CPL 2026 closest finishes
59. CPL 2026 successful run chases
60. CPL 2026 powerplay trends

### Standings and qualification

61. CPL 2026 points table explained
62. How net run rate works in the CPL
63. CPL 2026 qualification scenarios
64. What each team needs to reach the playoffs
65. CPL 2026 eliminated teams tracker
66. CPL 2026 top-two race
67. CPL 2026 playoff bracket
68. CPL Eliminator rules explained
69. CPL Qualifier 1 and Qualifier 2 explained
70. What happens when CPL teams finish level on points

### Viewing and tickets

71. How to watch CPL 2026 in the Caribbean
72. How to watch CPL 2026 in the United States
73. How to watch CPL 2026 in Canada
74. How to watch CPL 2026 in the United Kingdom
75. How to watch CPL 2026 in India
76. How to watch CPL 2026 in Pakistan
77. How to watch CPL 2026 in Australia
78. CPL 2026 TV channels and streaming services tracker
79. CPL 2026 radio and audio coverage guide
80. CPL 2026 ticket guide by host country
81. CPL 2026 finals tickets guide
82. What to check before buying CPL tickets

### Venues and travel

83. Arnos Vale Stadium CPL match guide
84. Sabina Park CPL match guide
85. Daren Sammy Cricket Ground CPL match guide
86. Sir Vivian Richards Stadium CPL match guide
87. Brian Lara Cricket Academy CPL match guide
88. Warner Park CPL match guide
89. Providence Stadium CPL match guide
90. Kensington Oval CPL final guide
91. CPL 2026 venue capacities and locations
92. CPL 2026 local-time guide for every host territory

### History and evergreen records

93. Every CPL champion from 2013 to 2025
94. Most successful CPL teams by titles
95. CPL franchise name changes explained
96. Jamaica Tallawahs and Jamaica Kingsmen: separate franchise histories
97. Trinbago Knight Riders title history
98. Barbados Tridents title history
99. Every CPL final: winner and venue
100. CPL all-time batting and bowling records

## Backlink strategy

1. Publish link-worthy first-party assets: downloadable calendar, verified time-zone table, franchise-lineage chart and records dataset.
2. Create one original statistic or visualization after every match week, with methodology and downloadable source table.
3. Pitch Caribbean newspapers, radio stations, supporter communities and cricket newsletters with a specific useful asset, not a generic homepage request.
4. Offer corrections and embeddable attribution for factual schedules; never exchange money or reciprocal sitewide links for ranking value.
5. Reclaim unlinked mentions only when the publication already references CPL Season or one of its original assets.
6. Maintain a public corrections and sourcing standard so journalists can trust and cite the work.

## Google Discover strategy

- Use original 1280×720 WebP images and `max-image-preview:large`.
- Publish timely, specific headlines without withholding the central fact.
- Pair match-day speed with visible sourcing, named authors and meaningful analysis.
- Avoid recycled press-release copy; add what changed, why it matters and what fans should do next.
- Keep dates and material updates accurate. Do not refresh dates without substantial changes.
- Build recurring entities and topic expertise rather than chasing unrelated trends.
- Discover inclusion cannot be guaranteed and should not be forecast as assured traffic.

## Traffic growth measurement

Track performance by page type, not only sitewide totals:

- Impressions, clicks, CTR and average position from Search Console.
- Indexed-to-submitted ratio for canonical sitemap URLs.
- Landing sessions and engaged sessions for schedule, match, team, player, news and history templates.
- Internal clicks from hubs to match/team/player entities.
- Returning visitors during match weeks.
- Feed freshness failures and live-state rendering errors.
- Revenue per thousand sessions by template, balanced against Core Web Vitals and engagement.

No responsible plan can promise rankings or traffic. The target is stronger crawlability, clearer topical coverage, better usefulness and more citation-worthy original assets.

## Monetization plan

1. Keep display ads outside score controls, navigation and critical match information.
2. Measure ad density separately on live, evergreen and news templates.
3. Use clearly disclosed official-ticket links; never imply ticket inventory is owned or guaranteed by CPL Season.
4. Consider affiliate relationships only for legitimate regional viewing or travel products with explicit disclosure.
5. Build an opt-in fixtures/results newsletter before sponsorship packages.
6. Package original data reports or newsletter sponsorships only after a stable audience exists.
7. Do not gate basic schedule, score, safety or viewing information behind payment.

## Definition of done for every future page

- The intent is not already satisfied by an existing canonical page.
- All time-sensitive claims have a first-party source and review date.
- The page has unique visible value, one H1, useful metadata and a self-canonical.
- Structured data matches visible content.
- Images have fixed dimensions, useful alt text and an appropriate loading strategy.
- The page has inbound and outbound contextual internal links.
- Mobile layout works without horizontal page scrolling.
- The page passes the site validator and appears in the sitemap only when indexable and useful.
