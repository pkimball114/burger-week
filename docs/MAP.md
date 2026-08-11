# Map Tab Plan

This app should stay static and GitHub-Pages-compatible. `data/burger-week-2026.csv` remains the source of truth for Burger Week listing data, including `latitude` and `longitude` once those fields are filled.

## Recommendation

Use Leaflet first, backed by either OpenStreetMap raster tiles for early testing or Geoapify tiles for a more durable free hosted option.

Leaflet is the smallest fit for this app: one CSS file, one JS file, simple custom HTML markers, mobile-friendly popups, and no build step. It can hide/show markers from the same filtered burger list already used by the Burger Board. If the map later needs vector styling, clustering at much larger scale, or richer animations, MapLibre GL JS is the best upgrade path.

Current implementation note: Leaflet `1.9.4` is vendored under `assets/vendor/leaflet/` so the static app does not depend on a CDN for the map library itself. The first-pass basemap uses OpenStreetMap raster tiles at runtime.

## Free Options

### Leaflet with OpenStreetMap tiles

- Best for: fastest prototype, no API key, simple markers/popups.
- Cost: no direct cost.
- Caveat: OpenStreetMap data is free, but the public tile servers are donation-funded, best-effort infrastructure with usage rules and no SLA. Use attribution, do not bulk-fetch tiles, and switch to a hosted tile provider if traffic grows.
- Links: [Leaflet docs](https://leafletjs.com/reference), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)

### Leaflet or MapLibre with Geoapify

- Best for: a free hosted API that includes tiles and geocoding in one account.
- Cost: free tier currently lists 3,000 credits per day, no credit card, with map tiles counting fractionally and geocoding typically one credit per request.
- Caveat: needs a public browser API key and visible attribution.
- Links: [Geoapify pricing](https://www.geoapify.com/pricing/), [Geoapify pricing details](https://www.geoapify.com/pricing-details/)

### MapLibre GL JS with MapTiler Cloud

- Best for: polished vector maps, custom basemap styling, future-proof WebGL rendering.
- Cost: free plan currently lists 5,000 API sessions/month and 100,000 API requests/month.
- Caveat: MapTiler's free plan is limited to personal/non-commercial use and research/development for commercial products. It requires an API key.
- Links: [MapLibre GL JS](https://maplibre.org/projects/gl-js/), [MapTiler Cloud pricing](https://www.maptiler.com/cloud/pricing/)

### MapLibre or Leaflet with self-hosted PMTiles

- Best for: avoiding third-party tile quotas and keeping the map fully static.
- Cost: tooling is free/open, hosting can be GitHub Pages if the tile archive is small enough.
- Caveat: a Portland-area tile archive still adds a large binary asset and a preparation step, so it should wait until the app needs offline-ish or quota-free maps.
- Links: [Protomaps PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre)

### OpenLayers

- Best for: complex GIS overlays, projections, WMS/vector sources, and advanced map controls.
- Cost: open-source library.
- Caveat: more capability and complexity than this app needs for 124 restaurant pins.
- Links: [OpenLayers docs](https://openlayers.org/doc/)

## Data Prerequisites

1. Keep `latitude` and `longitude` filled for all 124 CSV rows.
2. Keep `maps_url` as the external deep link used by quick links.
3. Add no duplicate map data file unless a later provider requires a generated artifact.
4. Validate coordinates before wiring the real map: Portland-area rows should generally fall near latitude `45.3` to `45.7` and longitude `-123.1` to `-122.3`, with wider bounds for Vancouver, Beaverton, Lake Oswego, and Oregon City.

Geocoding options:

- Manual lookup is safest for 124 rows because it lets us catch venue-specific address errors.
- Nominatim can be used deliberately for a small one-time pass, but it must respect the public usage policy: at most one request per second, single-threaded, identifying User-Agent or Referer, attribution, and local caching of results.
- Geoapify is likely the cleaner free geocoding path because the same account can supply map tiles and geocoding with clearer daily quotas.

This repo includes `scripts/geocode-burger-week.py` to populate missing `latitude` and `longitude` values without changing other CSV fields. It supports:

- Geoapify, preferred when `GEOAPIFY_API_KEY` is available.
- Nominatim, for a deliberate one-time no-key batch that obeys the OpenStreetMap usage policy.

Dry run with Geoapify:

```bash
GEOAPIFY_API_KEY=your-key python3 scripts/geocode-burger-week.py --provider geoapify
```

Write coordinates with Geoapify:

```bash
GEOAPIFY_API_KEY=your-key python3 scripts/geocode-burger-week.py --provider geoapify --write
```

No-key Nominatim dry run:

```bash
python3 scripts/geocode-burger-week.py --provider nominatim --user-agent "BurgerWeekGeocoder/1.0 (+your-contact-url-or-email)"
```

No-key Nominatim write:

```bash
python3 scripts/geocode-burger-week.py --provider nominatim --user-agent "BurgerWeekGeocoder/1.0 (+your-contact-url-or-email)" --write
```

The script is single-threaded, caches provider responses in an ignored local cache file, skips rows that already have coordinates unless `--overwrite` is passed, and rejects obvious out-of-region results.

## Implementation Steps

1. Add provider config:
   - `config/map.example.js` with `window.BurgerWeekMapConfig = { provider: "osm", geoapifyKey: "", maptilerKey: "" }`.
   - Optional `config/map.js` ignored by Git for private local keys.
   - Load it before `app.js` if needed.

2. Add a map adapter:
   - `initMap()` creates the Leaflet map only when the Map tab is opened.
   - `syncMapMarkers()` receives the same visible burgers used by Burger Board filters.
   - `destroyMap()` is probably unnecessary for this app; keep the instance and update markers.

3. Reuse filtering:
   - `renderFilteredViews()` calls `renderMap()`.
   - `burgerMatchesActiveFilters(burger, visitedIds)` keeps Search, Area, Open now, and Hide visited synced with markers.
   - Friend and Min rating should keep affecting Feed only unless a future design explicitly makes the Map review-aware.

4. Build custom markers:
   - Use a burger-counter-styled `L.divIcon` marker with initials or a short count badge.
   - Add richer marker states for wanted, reviewed-by-me, open-now, and active filter status.
   - Cluster only if 124 pins feels crowded after real coordinates land.

5. Add detail popups:
   - Current map-local options can show hours, image, description, average rating, total visitors, and want count/rank.
   - Popups are capped and scrollable, with Leaflet auto-pan disabled so opening a larger detail bubble does not shove the map underneath it.
   - A floating top-right map icon opens full-screen mode, hiding Map Details controls so users have more room to pan, zoom, and inspect dense marker clusters.
   - A later shared `burgerDetailHtml(burger, options)` helper can further align Burger Board rows and map popups.
   - In a richer map popup, use compact tabs such as `Details`, `Reviews`, and `Plan`.
   - Include a `View on Board` button that switches to the Burger Board tab and focuses `#burger-row-<id>`.

6. Preserve graceful fallback:
   - If the map library or tiles fail to load, keep the current grouped list usable.
   - If coordinates are missing, show those burgers in the side list with a maps deep link, but do not place fake pins on the real map.
   - Do not require Supabase for map browsing.

7. Verify:
   - `node --check app.js`
   - `python3 -m json.tool manifest.webmanifest`
   - CSV validation for row count, required headers, coordinate parseability, and unchanged IDs.
   - Browser checks on a fresh localhost port: map initializes, markers match active filters, marker popup opens, detail actions work, mobile has no horizontal overflow, and no stale service-worker cache is involved.

## Suggested First Code Pass

The first production-minded map UI pass should be Leaflet plus OpenStreetMap or Geoapify tiles, gated by graceful fallback:

1. Reuse the vendored Leaflet assets from `assets/vendor/leaflet/`.
2. Reuse `burgerMatchesActiveFilters()` for marker visibility.
3. Move Burger Board card summary markup into a shared helper so popups and rows stay consistent.
4. Add marker states for wanted, reviewed-by-me, open-now, and active filter status.
5. Bump `sw.js` cache only when deploying the changed app shell/code/styles/config/CSV/vendor assets.
