# Map Tab Plan

This app should stay static and GitHub-Pages-compatible. `data/burger-week-2026.csv` remains the source of truth for Burger Week listing data, including `latitude` and `longitude` once those fields are filled.

## Recommendation

Use Leaflet first, backed by either OpenStreetMap raster tiles for early testing or Geoapify tiles for a more durable free hosted option.

Leaflet is the smallest fit for this app: one CSS file, one JS file, simple custom HTML markers, mobile-friendly popups, and no build step. It can hide/show markers from the same filtered burger list already used by the Burger Board. If the map later needs vector styling, clustering at much larger scale, or richer animations, MapLibre GL JS is the best upgrade path.

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

1. Fill `latitude` and `longitude` for all 124 CSV rows.
2. Keep `maps_url` as the external deep link used by quick links.
3. Add no duplicate map data file unless a later provider requires a generated artifact.
4. Validate coordinates before wiring the real map: Portland-area rows should generally fall near latitude `45.3` to `45.7` and longitude `-123.1` to `-122.3`, with wider bounds for Vancouver, Beaverton, Lake Oswego, and Oregon City.

Geocoding options:

- Manual lookup is safest for 124 rows because it lets us catch venue-specific address errors.
- Nominatim can be used deliberately for a small one-time pass, but it must respect the public usage policy: at most one request per second, single-threaded, identifying User-Agent or Referer, attribution, and local caching of results.
- Geoapify is likely the cleaner free geocoding path because the same account can supply map tiles and geocoding with clearer daily quotas.

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
   - Extend `renderFilteredViews()` to call `renderMap()` or `syncMapMarkers()`.
   - Use `burgerMatchesActiveFilters(burger, visitedIds)` so Search, Area, Open now, and Hide visited affect markers.
   - Friend and Min rating should keep affecting Feed only unless a future design explicitly makes the Map review-aware.

4. Build custom markers:
   - Use a burger-counter-styled `L.divIcon` marker with initials or a short count badge.
   - Add marker states for wanted, reviewed-by-me, open-now, and hidden-filtered-out.
   - Cluster only if 124 pins feels crowded after real coordinates land.

5. Add detail popups:
   - Create a shared `burgerDetailHtml(burger, options)` helper using Burger Board fields: restaurant, burger name, description, neighborhood, availability, wait report, rating summary, Want/Hide actions, maps link, EverOut link, and photo preview trigger.
   - In the map popup, use compact tabs such as `Details`, `Reviews`, and `Plan`.
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

The first production-minded pass should be Leaflet plus OpenStreetMap or Geoapify tiles, gated by graceful fallback:

1. Fill and validate coordinates in the CSV.
2. Add Leaflet from a pinned CDN URL in `index.html`.
3. Replace the schematic `.portland-map` contents with a real map container.
4. Add `initMap()` and `syncMapMarkers()` in `app.js`.
5. Reuse `burgerMatchesActiveFilters()` for marker visibility.
6. Move Burger Board card summary markup into a shared helper so popups and rows stay consistent.
7. Bump `sw.js` cache only when deploying the changed app shell/code/styles/config/CSV.
