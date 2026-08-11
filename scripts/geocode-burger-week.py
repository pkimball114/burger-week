#!/usr/bin/env python3
"""Fill missing latitude/longitude values in the Burger Week CSV."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


DEFAULT_CSV = Path("data/burger-week-2026.csv")
DEFAULT_CACHE = Path("scripts/.geocode-cache.json")
PORTLAND_BIAS = (-122.6784, 45.5152)
REGIONAL_BOUNDS = {
    "min_lat": 45.25,
    "max_lat": 45.80,
    "min_lon": -123.20,
    "max_lon": -122.20,
}
LOCALITIES = [
    ("Vancouver", "Vancouver", "WA"),
    ("Beaverton", "Beaverton", "OR"),
    ("Lake Oswego", "Lake Oswego", "OR"),
    ("Oregon City", "Oregon City", "OR"),
    ("Tigard", "Tigard", "OR"),
    ("Milwaukie", "Milwaukie", "OR"),
]
ORDINAL_REPLACEMENTS = {
    "First": "1st",
    "Second": "2nd",
    "Third": "3rd",
    "Fourth": "4th",
    "Fifth": "5th",
    "Sixth": "6th",
    "Seventh": "7th",
    "Eighth": "8th",
    "Ninth": "9th",
    "Tenth": "10th",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Geocode Burger Week restaurant addresses and write missing "
            "latitude/longitude values back to the CSV."
        )
    )
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help=f"CSV path. Default: {DEFAULT_CSV}")
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE, help=f"Local response cache. Default: {DEFAULT_CACHE}")
    parser.add_argument(
        "--provider",
        choices=["auto", "geoapify", "nominatim"],
        default="auto",
        help="Geocoding provider. Default: auto, using Geoapify when GEOAPIFY_API_KEY is set.",
    )
    parser.add_argument("--api-key", default=os.environ.get("GEOAPIFY_API_KEY", ""), help="Geoapify API key.")
    parser.add_argument(
        "--user-agent",
        default="BurgerWeekGeocoder/1.0 (+https://github.com/; one-time CSV coordinate update)",
        help="User-Agent for Nominatim. Use a project URL or contact if available.",
    )
    parser.add_argument("--email", default="", help="Optional contact email for Nominatim requests.")
    parser.add_argument("--sleep", type=float, default=1.2, help="Seconds to wait between uncached requests.")
    parser.add_argument("--limit", type=int, default=0, help="Limit rows processed, useful for testing.")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing latitude/longitude values.")
    parser.add_argument("--write", action="store_true", help="Write coordinates to the CSV. Omit for dry run.")
    parser.add_argument("--verbose", action="store_true", help="Print failed query details.")
    return parser.parse_args()


def load_cache(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def save_cache(path: Path, cache: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(cache, handle, indent=2, sort_keys=True)
        handle.write("\n")


def infer_locality(row: dict) -> tuple[str, str]:
    haystack = f"{row.get('neighborhood', '')} {row.get('address', '')}".lower()
    for needle, city, state in LOCALITIES:
        if needle.lower() in haystack:
            return city, state
    return "Portland", "OR"


def normalize_address(address: str) -> str:
    normalized = address.strip()
    normalized = re.sub(r"\bTwo\s+NW\s+Fifth\s+Ave\b", "2 NW 5th Ave", normalized, flags=re.IGNORECASE)
    for word, ordinal in ORDINAL_REPLACEMENTS.items():
        normalized = re.sub(rf"\b{word}\b", ordinal, normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\b(?:suite|ste\.?|unit|#)\s*[A-Za-z0-9-]+\b", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\b(Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Place|Pl)\s+[A-Z]\b", r"\1", normalized)
    normalized = re.sub(r"\s+,", ",", normalized)
    normalized = re.sub(r",\s*,", ",", normalized)
    normalized = re.sub(r"\s{2,}", " ", normalized)
    return normalized.strip(" ,.")


def address_with_region(address: str, city: str, state: str) -> str:
    address_lower = address.lower()
    has_city = city.lower() in address_lower
    has_state = re.search(rf"\b{re.escape(state.lower())}\b", address_lower) is not None
    if has_city or has_state:
        return f"{address}, USA"
    return f"{address}, {city}, {state}, USA"


def query_candidates(row: dict) -> list[str]:
    restaurant = row.get("restaurant", "").strip()
    address = normalize_address(row.get("address", ""))
    city, state = infer_locality(row)
    address_region = address_with_region(address, city, state)
    return [
        f"{restaurant}, {address_region}",
        address_region,
        f"{restaurant}, {city}, {state}, USA",
    ]


def is_missing_coordinate(row: dict) -> bool:
    return not row.get("latitude", "").strip() or not row.get("longitude", "").strip()


def in_regional_bounds(lat: float, lon: float) -> bool:
    return (
        REGIONAL_BOUNDS["min_lat"] <= lat <= REGIONAL_BOUNDS["max_lat"]
        and REGIONAL_BOUNDS["min_lon"] <= lon <= REGIONAL_BOUNDS["max_lon"]
    )


def request_json(url: str, user_agent: str) -> object:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def geoapify_url(query: str, api_key: str) -> str:
    params = {
        "text": query,
        "format": "json",
        "limit": "1",
        "filter": "countrycode:us",
        "bias": f"proximity:{PORTLAND_BIAS[0]},{PORTLAND_BIAS[1]}",
        "apiKey": api_key,
    }
    return "https://api.geoapify.com/v1/geocode/search?" + urllib.parse.urlencode(params)


def nominatim_url(query: str, email: str) -> str:
    params = {
        "q": query,
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "us",
        "addressdetails": "1",
    }
    if email:
        params["email"] = email
    return "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)


def parse_geoapify(data: object) -> dict | None:
    if not isinstance(data, dict):
        return None
    results = data.get("results") or []
    if not results:
        return None
    result = results[0]
    try:
        lat = float(result["lat"])
        lon = float(result["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    return {
        "lat": lat,
        "lon": lon,
        "label": result.get("formatted") or result.get("address_line1") or "",
        "confidence": result.get("rank", {}).get("confidence"),
    }


def parse_nominatim(data: object) -> dict | None:
    if not isinstance(data, list) or not data:
        return None
    result = data[0]
    try:
        lat = float(result["lat"])
        lon = float(result["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    return {
        "lat": lat,
        "lon": lon,
        "label": result.get("display_name") or result.get("name") or "",
        "confidence": result.get("importance"),
    }


def geocode_query(provider: str, query: str, args: argparse.Namespace, cache: dict) -> dict:
    cache_key = f"{provider}:{query}"
    if cache_key in cache and "error" not in cache[cache_key]:
        return cache[cache_key]

    if provider == "geoapify":
        url = geoapify_url(query, args.api_key)
        parser = parse_geoapify
    else:
        url = nominatim_url(query, args.email)
        parser = parse_nominatim

    try:
        data = request_json(url, args.user_agent)
        parsed = parser(data)
        result = {"ok": bool(parsed), "query": query, "result": parsed}
        cache[cache_key] = result
        save_cache(args.cache, cache)
    except (TimeoutError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as error:
        result = {"ok": False, "query": query, "error": str(error)}
        if args.verbose:
            print(f"Request failed for {query}: {error}", file=sys.stderr)

    time.sleep(max(0, args.sleep))
    return result


def geocode_row(row: dict, provider: str, args: argparse.Namespace, cache: dict) -> dict | None:
    for query in query_candidates(row):
        response = geocode_query(provider, query, args, cache)
        result = response.get("result") if response.get("ok") else None
        if args.verbose and response.get("error"):
            print(f"Query error for {row.get('id')}: {response['error']}", file=sys.stderr)
        if not result:
            continue
        if in_regional_bounds(result["lat"], result["lon"]):
            return result
        print(
            f"Out-of-region result skipped for {row.get('id')}: "
            f"{result['lat']},{result['lon']} {result.get('label', '')}",
            file=sys.stderr,
        )
    return None


def select_provider(args: argparse.Namespace) -> str:
    if args.provider != "auto":
        provider = args.provider
    else:
        provider = "geoapify" if args.api_key else "nominatim"
    if provider == "geoapify" and not args.api_key:
        raise SystemExit("Geoapify requires --api-key or GEOAPIFY_API_KEY.")
    return provider


def write_csv(path: Path, headers: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    args = parse_args()
    provider = select_provider(args)
    cache = load_cache(args.cache)

    with args.csv.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        rows = list(reader)

    for header in ("latitude", "longitude"):
        if header not in headers:
            raise SystemExit(f"Missing required CSV header: {header}")

    candidates = [row for row in rows if args.overwrite or is_missing_coordinate(row)]
    if args.limit:
        candidates = candidates[: args.limit]

    print(f"Provider: {provider}")
    print(f"Rows in CSV: {len(rows)}")
    print(f"Rows to geocode: {len(candidates)}")
    print(f"Mode: {'write' if args.write else 'dry run'}")

    updated = 0
    failed = []
    for index, row in enumerate(candidates, start=1):
        result = geocode_row(row, provider, args, cache)
        label = f"{row.get('id')} {row.get('restaurant')}"
        if result:
            print(f"[{index}/{len(candidates)}] {label}: {result['lat']:.6f},{result['lon']:.6f}")
            row["latitude"] = f"{result['lat']:.6f}"
            row["longitude"] = f"{result['lon']:.6f}"
            updated += 1
        else:
            print(f"[{index}/{len(candidates)}] {label}: no result")
            failed.append(row.get("id", ""))

    if args.write and updated:
        write_csv(args.csv, headers, rows)
        print(f"Wrote {updated} coordinate pair(s) to {args.csv}.")
    elif not args.write:
        print("Dry run complete; rerun with --write to update the CSV.")

    if failed:
        print("Rows without coordinates: " + ", ".join(failed), file=sys.stderr)
    return 0 if updated or not candidates else 1


if __name__ == "__main__":
    raise SystemExit(main())
