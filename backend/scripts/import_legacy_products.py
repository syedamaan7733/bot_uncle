#!/usr/bin/env python3
"""
Import legacy Mongo products into the existing /products API.

Why this script:
- Uses the same product creation API used by frontend.
- Expands one legacy product into N products (one per color).
- Automatically creates missing categories through /categories API.
- Supports dry-run and simple resume safety by skipping duplicate (name, categoryId) pairs.

Input format:
- A JSON array of products, or
- JSON Lines file (.jsonl), one product object per line.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _hr(char: str = "-", width: int = 78) -> str:
    return char * width


_COLOR_ENABLED = sys.stdout.isatty()
_ANSI_RESET = "\033[0m"
_ANSI_COLORS = {
    "cyan": "\033[36m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "red": "\033[31m",
    "magenta": "\033[35m",
    "bold": "\033[1m",
}


def _c(text: str, color: str) -> str:
    if not _COLOR_ENABLED:
        return text
    code = _ANSI_COLORS.get(color)
    if not code:
        return text
    return f"{code}{text}{_ANSI_RESET}"


def _build_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _request_json(
    method: str,
    url: str,
    headers: Dict[str, str],
    payload: Optional[Dict[str, Any]] = None,
) -> Tuple[int, Dict[str, Any]]:
    data: Optional[bytes] = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = Request(url=url, data=data, method=method.upper())
    for key, value in headers.items():
        req.add_header(key, value)

    try:
        with urlopen(req, timeout=45) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else {}
    except HTTPError as exc:
        body = exc.read().decode("utf-8") if exc.fp else ""
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return exc.code, parsed
    except URLError as exc:
        return 0, {"error": f"Network error: {exc}"}
    except Exception as exc:  # noqa: BLE001
        return 0, {"error": f"Unexpected request error: {exc}"}


def load_legacy_products(path: Path) -> List[Dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return []

    if path.suffix.lower() == ".jsonl":
        rows = []
        for i, line in enumerate(raw.splitlines(), start=1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON at line {i}: {exc}") from exc
        return rows

    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        # Accept object wrappers: { "products": [...] }
        if isinstance(parsed.get("products"), list):
            return parsed["products"]
        return [parsed]
    raise ValueError("Unsupported input shape; expected JSON array/object or JSONL.")


def fetch_categories(api_base: str, headers: Dict[str, str]) -> Dict[str, str]:
    status, body = _request_json("GET", f"{api_base}/categories", headers)
    if status != 200:
        raise RuntimeError(f"Failed to fetch categories: HTTP {status} -> {body}")

    mapping: Dict[str, str] = {}
    if not isinstance(body, list):
        return mapping

    for category in body:
        name = _normalize_text(category.get("name"))
        cat_id = _normalize_text(category.get("id"))
        if name and cat_id:
            mapping[name.lower()] = cat_id
    return mapping


def create_category(
    api_base: str,
    headers: Dict[str, str],
    category_name: str,
) -> str:
    payload = {"name": category_name}
    status, body = _request_json("POST", f"{api_base}/categories", headers, payload)
    if status in (200, 201) and isinstance(body, dict) and body.get("id"):
        return str(body["id"])

    raise RuntimeError(
        f"Failed to create category '{category_name}': HTTP {status} -> {body}"
    )


def fetch_existing_products(api_base: str, headers: Dict[str, str]) -> set[Tuple[str, str]]:
    status, body = _request_json("GET", f"{api_base}/products", headers)
    if status != 200 or not isinstance(body, list):
        return set()

    existing = set()
    for row in body:
        name = _normalize_text(row.get("name"))
        category_id = _normalize_text(row.get("categoryId"))
        if name and category_id:
            existing.add((name.lower(), category_id))
    return existing


@dataclass
class ImportStats:
    source_products: int = 0
    generated_variants: int = 0
    created_products: int = 0
    skipped_duplicates: int = 0
    failed_products: int = 0
    created_categories: int = 0


def build_line3(source: Dict[str, Any], color: str) -> str:
    description = _normalize_text(source.get("description"))
    if description:
        return description

    gender = _normalize_text(source.get("gender"))
    material = _normalize_text(source.get("material"))
    category = _normalize_text(source.get("category"))
    parts = [p for p in [gender, material, category, color] if p]
    if parts:
        return " ".join(parts)
    return "Imported product"


def build_variants(source: Dict[str, Any]) -> Iterable[Tuple[str, Dict[str, Any]]]:
    article = _normalize_text(source.get("article"))
    if not article:
        return []

    brand = _normalize_text(source.get("brand"))
    material = _normalize_text(source.get("material"))
    colors = source.get("colors") or {}

    if isinstance(colors, dict) and colors:
        variants = []
        for color, urls in colors.items():
            color_name = _normalize_text(color)
            if not color_name:
                continue
            image_urls = urls if isinstance(urls, list) else []
            image_urls = [str(url).strip() for url in image_urls if str(url).strip()]
            # Keep exactly one image per color variant (first image only).
            image_urls = image_urls[:1]
            variant_payload = {
                "name": f"{article} {color_name}",
                "price": source.get("price", 0),
                "line1": brand,
                "line2": material,
                "line3": build_line3(source, color_name),
                "imageUrls": image_urls,
            }
            variants.append((color_name, variant_payload))
        return variants

    # Fallback: if color map missing, import one product with all images.
    image_urls = source.get("images") if isinstance(source.get("images"), list) else []
    image_urls = [str(url).strip() for url in image_urls if str(url).strip()]
    return [
        (
            "DEFAULT",
            {
                "name": article,
                "price": source.get("price", 0),
                "line1": brand,
                "line2": material,
                "line3": build_line3(source, "DEFAULT"),
                "imageUrls": image_urls,
            },
        )
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import legacy products using the existing /products API."
    )
    parser.add_argument("--input", required=True, help="Path to source JSON/JSONL file.")
    parser.add_argument(
        "--api-base",
        default="http://localhost:3000",
        help="API base URL (default: http://localhost:3000)",
    )
    parser.add_argument(
        "--token",
        required=True,
        help="JWT bearer token for authenticated product/category APIs.",
    )
    parser.add_argument(
        "--no-create-missing-categories",
        action="store_true",
        help="Do not auto-create missing categories.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be created without writing to DB.",
    )
    parser.add_argument(
        "--sleep-ms",
        type=int,
        default=2000,
        help="Delay between API calls in milliseconds (default: 2000).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=15,
        help="Pause after every N successful uploads (default: 15).",
    )
    parser.add_argument(
        "--batch-rest-ms",
        type=int,
        default=30000,
        help="Pause duration after each batch in milliseconds (default: 30000).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_base = args.api_base.rstrip("/")
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 1

    try:
        products = load_legacy_products(input_path)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to load input file: {exc}", file=sys.stderr)
        return 1

    headers = _build_headers(args.token)
    stats = ImportStats(source_products=len(products))

    try:
        category_map = fetch_categories(api_base, headers)
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        return 1

    existing_pairs = fetch_existing_products(api_base, headers)

    failures: List[Dict[str, Any]] = []
    create_missing_categories = not args.no_create_missing_categories

    print(_c(_hr("="), "cyan"))
    print(_c("LEGACY PRODUCT IMPORT", "bold"))
    print(_c(_hr("="), "cyan"))
    print(f"Source products        : {len(products)}")
    print(f"Auto-create categories : {create_missing_categories}")
    print(f"Per upload delay (ms)  : {args.sleep_ms}")
    print(f"Batch size             : {args.batch_size}")
    print(f"Batch rest (ms)        : {args.batch_rest_ms}")
    print(_c(_hr("="), "cyan"))

    for idx, source in enumerate(products, start=1):
        source_id = source.get("_id")
        article = _normalize_text(source.get("article"))
        source_category = _normalize_text(source.get("category"))
        print(
            f"\n[{idx:>4}/{len(products)}] "
            f"source_id={source_id} | article={article} | category={source_category}"
        )
        if not source_category:
            failures.append(
                {
                    "sourceId": source_id,
                    "error": "Missing category in source product",
                }
            )
            stats.failed_products += 1
            continue

        category_key = source_category.lower()
        category_id = category_map.get(category_key)

        if not category_id and create_missing_categories:
            if args.dry_run:
                category_id = f"DRY-RUN-{source_category}"
                stats.created_categories += 1
                category_map[category_key] = category_id
                print(_c(f"  [DRY-RUN] category create -> {source_category}", "magenta"))
            else:
                try:
                    category_id = create_category(api_base, headers, source_category)
                    category_map[category_key] = category_id
                    stats.created_categories += 1
                    print(_c(f"  [CATEGORY] created '{source_category}' -> {category_id}", "green"))
                except Exception as exc:  # noqa: BLE001
                    failures.append(
                        {
                            "sourceId": source_id,
                            "category": source_category,
                            "error": str(exc),
                        }
                    )
                    stats.failed_products += 1
                    continue

        if not category_id:
            failures.append(
                {
                    "sourceId": source_id,
                    "category": source_category,
                    "error": "Category not found and auto-create is disabled.",
                }
            )
            stats.failed_products += 1
            continue

        variants = list(build_variants(source))
        if not variants:
            failures.append(
                {"sourceId": source_id, "error": "No valid variant generated (missing article/colors)."}
            )
            stats.failed_products += 1
            continue
        print(f"  [VARIANTS] generated: {len(variants)}")

        for color_name, payload in variants:
            stats.generated_variants += 1
            payload["categoryId"] = category_id

            key = (_normalize_text(payload.get("name")).lower(), category_id)
            if key in existing_pairs:
                stats.skipped_duplicates += 1
                print(_c(f"     [SKIP] duplicate -> {payload.get('name')}", "yellow"))
                continue

            if args.dry_run:
                print(json.dumps(payload, ensure_ascii=True))
                stats.created_products += 1
                existing_pairs.add(key)
            else:
                status, body = _request_json(
                    "POST", f"{api_base}/products", headers, payload
                )
                if status in (200, 201):
                    stats.created_products += 1
                    existing_pairs.add(key)
                    print(_c(
                        f"     [UPLOAD {stats.created_products:>4}] [OK] "
                        f"{payload.get('name')} | color={color_name} | "
                        f"image={payload.get('imageUrls', [])[:1]}"
                    , "green"))
                    if (
                        args.batch_size > 0
                        and args.batch_rest_ms > 0
                        and stats.created_products % args.batch_size == 0
                    ):
                        rest_s = args.batch_rest_ms / 1000.0
                        print(_c(
                            f"     [PAUSE] reached {stats.created_products} uploads; "
                            f"sleeping {rest_s:.1f}s..."
                        , "yellow"))
                        time.sleep(rest_s)
                        print(_c("     [RESUME] continuing uploads.", "cyan"))
                else:
                    stats.failed_products += 1
                    print(_c(
                        f"     [FAIL] {payload.get('name')} | status={status} | response={body}"
                    , "red"))
                    failures.append(
                        {
                            "sourceId": source_id,
                            "payload": payload,
                            "status": status,
                            "response": body,
                        }
                    )
                time.sleep(max(args.sleep_ms, 0) / 1000.0)

    print(f"\n{_c(_hr('='), 'cyan')}")
    print(_c("IMPORT SUMMARY", "bold"))
    print(_c(_hr('='), "cyan"))
    print(f"source_products      : {stats.source_products}")
    print(f"generated_variants   : {stats.generated_variants}")
    print(f"created_products     : {stats.created_products}")
    print(f"skipped_duplicates   : {stats.skipped_duplicates}")
    print(f"created_categories   : {stats.created_categories}")
    print(f"failed_products      : {stats.failed_products}")
    print(_c(_hr('='), "cyan"))

    if failures:
        failed_path = input_path.with_suffix(f"{input_path.suffix}.failed.json")
        failed_path.write_text(json.dumps(failures, indent=2), encoding="utf-8")
        print(f"Failures written to: {failed_path}")
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

