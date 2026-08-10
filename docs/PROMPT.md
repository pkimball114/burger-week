Continue development of the Burger Week app in /Users/parkerkimball/Documents/Burger Week. First read docs/HANDOFF.md, README.md, app.js, index.html, styles.css, and data/burger-week-2026.csv.

Treat data/burger-week-2026.csv as the current source of truth for all 124 Burger Week 2026 restaurant/burger listing records. Do not replace, regenerate, or override CSV data from older placeholder assumptions unless I explicitly provide a newer source file or ask for a data correction.

Keep the app static and GitHub-Pages-compatible. Supabase is supported only for shared app features such as auth, profiles, reviews, wants, and review photo uploads, plus private per-user hidden burgers. Hidden burgers must always be scoped to the current user: if one user hides a burger, that must not affect any other user’s view of the app. Do not move core burger listing data out of the CSV unless I explicitly ask. Preserve graceful local-only behavior when Supabase is not configured.

Make GitHub hosting efficient: avoid unnecessary large assets, avoid duplicate data files, keep cache/service-worker changes intentional, and bump the service-worker cache only when deployed static assets or CSV data need it.

Preserve the current Bob's-Burgers-inspired visual direction without using copyrighted characters, logos, or protected artwork.

After inspecting the code, propose the smallest safe implementation plan for my requested change, then implement it. Verify with node --check app.js, JSON validation where relevant, CSV validation if data changes, and browser checks on a fresh localhost port when UI behavior changes. For CSV-only data-entry updates, skip localhost/browser checks unless I ask.