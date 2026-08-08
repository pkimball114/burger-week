# Burger Week

A mobile-friendly, friend-only Burger Week review app for Portland Mercury Burger Week 2026. It is a tiny Yelp-style social feed: friends can log in locally, rate burgers in 0.25 increments, add a photo, leave notes, and filter the week by person, area, rating, and restaurant.

The current version is a static prototype that works on GitHub Pages and stores account and review data in each browser with `localStorage`. To make reviews shared across the whole group, wire it to Supabase using [docs/supabase-schema.sql](docs/supabase-schema.sql) and [config/supabase.example.js](config/supabase.example.js).

## Run

Serve the folder so the app can fetch its JSON and CSV data:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

Avoid reusing an old localhost port if you are checking service-worker-related changes; a fresh port keeps old browser caches out of the way.

## Publish

The app can be published with GitHub Pages from the repository root. See [docs/PUBLISHING.md](docs/PUBLISHING.md) for first-time setup, update steps, and the service-worker cache bump needed when deploying new CSV/photo data.

## Supabase

Shared login, reviews, wants, hidden burgers, and review photo uploads are supported through optional Supabase configuration. See [docs/SUPABASE.md](docs/SUPABASE.md). If Supabase is not configured, the app remains usable in local-only mode.

## Data

The app loads editable listing data from one event CSV:

- [data/burger-week-2026.csv](data/burger-week-2026.csv)
- [data/photos/](data/photos/)

`data/burger-week-2026.csv` is the main file used by the app. If it has fewer than 124 Burger Week rows, the app pads the board with generated placeholders so the interface still matches the 2026 event size. Day-specific `hours_monday` through `hours_sunday` columns determine which event dates each burger is available.

The EverOut listing URL supplied for the project should be used as the canonical source for the complete 2026 restaurant and burger details:

https://everout.com/portland/events/the-portland-mercurys-burger-week-2026/e222750/

## Roadmap

Phase 1:
- Static mobile app with local login, review composer, user photo upload, restaurant-photo reveal button, 0.25-step ratings, notes, clickable friend filters, maps/listing quick links, burger Want buttons, personal Hide buttons with a profile Hidden List, a Hype List, area filter, rating filter, sorting, stats, and an activity feed.
- GitHub Pages compatible.

Phase 2:
- Replace the schematic map with Mapbox, Google Maps, or Leaflet.
- Add exact addresses, coordinates, restaurant hours, and blackout dates.
- Turn the week calendar into a planning view with availability by day.

Phase 3:
- Promote `events`, `food_items`, and `reviews` into event-agnostic tables.
- Archive Burger Week 2026 by setting `events.archived_at`.
- Add future food weeks such as Dumpling Week without changing the review UI.

## Shared App Upgrade

For a dozen friends, Supabase is the lightest path:
- Supabase Auth with invite-only email sign-in.
- Postgres tables from [docs/supabase-schema.sql](docs/supabase-schema.sql).
- Storage bucket for burger photos.
- Row-level security so friends can read all reviews/wants, hide burgers privately, and only edit their own data.
- GitHub Pages, Vercel, or Netlify for static hosting.

The important product decision: a pure GitHub Pages app cannot share reviews between devices by itself. It needs a backend for the group feed.
