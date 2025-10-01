#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds site/data/news.json (up to 10 items) and archives the previous day's
file at site/data/archive/YYYY-MM-DD.json. Also writes site/data/archive/index.json
for the archive page.

It will try to fetch yesterday's deployed file from the live Pages URL to keep
history across runs (no repo commits needed).
"""

import os, json, re, time, hashlib, sys
from datetime import datetime, timezone, date
from urllib.parse import urlparse

import feedparser
import requests

SITE_DIR = "site"
OUT_JSON = os.path.join(SITE_DIR, "data", "news.json")
ARCHIVE_DIR = os.path.join(SITE_DIR, "data", "archive")
ARCHIVE_INDEX = os.path.join(ARCHIVE_DIR, "index.json")
TIMEOUT = 10
UA = "RetirementBot-News/1.3 (+github-actions)"

# Feeds
FEEDS = [
    "https://www.aarp.org/rss/aarp/everything.xml",
    "https://www.nextavenue.org/feed/",
    "https://www.kffhealthnews.org/topic/aging/feed/",
    "https://www.ncoa.org/news/articles/feed/",
    "https://blog.medicare.gov/feed/",
    "https://www.ssa.gov/newsroom/press-releases/rss.xml",
    "https://www.nia.nih.gov/news-events/newsroom/rss.xml",
    "https://tools.cdc.gov/api/v2/resources/media/403372.rss",
    "https://www.ftc.gov/feeds/consumerscams.xml"
]

def ensure_dir(p): os.makedirs(os.path.dirname(p), exist_ok=True)

def base_url_from_env():
    # Compute https://{owner}.github.io/{repo} if possible
    repo = os.getenv("GITHUB_REPOSITORY", "")  # e.g. "architeketh/Retirement-bot"
    if "/" in repo:
        owner, name = repo.split("/", 1)
        return f"https://{owner}.github.io/{name}"
    # fallback: user can override
    return os.getenv("SITE_BASE_URL", "").rstrip("/")

def hostname(u):
    try:
        h = urlparse(u).hostname or ""
        return h.replace("www.", "")
    except Exception:
        return ""

def clean_html(s):
    if not s: return ""
    return re.sub(r"<[^>]+>", " ", s).replace("\xa0", " ").strip()

def ts_from_entry(e):
    for k in ("published_parsed","updated_parsed","created_parsed"):
        v = e.get(k)
        if v:
            try: return int(time.mktime(v))
            except Exception: pass
    return int(time.time())

def try_image(entry, page_url):
    for k in ("media_content","media_thumbnail"):
        v = entry.get(k)
        if isinstance(v, list) and v:
            u = v[0].get("url")
            if u: return u
    for link in entry.get("links", []):
        if link.get("rel") == "enclosure" and "image" in (link.get("type") or ""):
            return link.get("href")
    if page_url:
        try:
            r = requests.get(page_url, headers={"User-Agent": UA}, timeout=TIMEOUT)
            if r.ok:
                m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', r.text, re.I)
                if not m:
                    m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', r.text, re.I)
                if m: return m.group(1)
        except Exception:
            pass
    return None

def dedup_key(title, link):
    s = (title or "").strip().lower() + "||" + (link or "").strip().lower()
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def collect():
    items, seen = [], set()
    headers = {"User-Agent": UA}
    for url in FEEDS:
        try:
            feed = feedparser.parse(url, request_headers=headers)
            for e in feed.entries:
                link = e.get("link")
                title = (e.get("title") or "").strip()
                if not title or not link:
                    continue
                key = dedup_key(title, link)
                if key in seen:
                    continue
                seen.add(key)
                items.append({
                    "title": title,
                    "url": link,
                    "source": hostname(link),
                    "summary": clean_html(e.get("summary") or e.get("description") or ""),
                    "published_ts": ts_from_entry(e),
                    "image": try_image(e, link)
                })
        except Exception as ex:
            print(f"[WARN] feed failed {url}: {ex}", file=sys.stderr)
    # newest first; cap 10
    items.sort(key=lambda x: x["published_ts"], reverse=True)
    items = items[:10]
    for it in items:
        it["published"] = datetime.fromtimestamp(it["published_ts"], tz=timezone.utc).isoformat()
    return items

def fetch_live_json(url):
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
        if r.ok: return r.json()
    except Exception:
        pass
    return None

def write_archive_if_needed(live_url):
    """If yesterday's deployed news.json exists and is from a prior UTC day,
       copy it into archive/YYYY-MM-DD.json and update archive/index.json."""
    if not live_url: return
    live = fetch_live_json(live_url + "/data/news.json")
    if not live: return
    fetched_at = live.get("fetched_at") or ""
    try:
        fetched_day = datetime.fromisoformat(fetched_at.replace("Z","+00:00")).date()
    except Exception:
        return
    today = date.today()
    if fetched_day >= today:
        return  # same day, nothing to archive

    ensure_dir(os.path.join(ARCHIVE_DIR, "x.json"))
    # write yesterday (or prior day) snapshot if not already present
    arc_path = os.path.join(ARCHIVE_DIR, f"{fetched_day.isoformat()}.json")
    if not os.path.exists(arc_path):
        with open(arc_path, "w", encoding="utf-8") as f:
            json.dump(live, f, ensure_ascii=False, indent=2)
        print(f"[archive] saved {arc_path}")

    # update archive index
    idx = []
    if os.path.exists(ARCHIVE_INDEX):
        try:
            with open(ARCHIVE_INDEX, "r", encoding="utf-8") as f:
                idx = json.load(f)
        except Exception:
            idx = []
    # ensure unique by date
    dates = {e.get("date"): e for e in idx if isinstance(e, dict) and e.get("date")}
    dates[fetched_day.isoformat()] = {"date": fetched_day.isoformat(), "total": live.get("total", 0)}
    # keep 120 most recent days
    idx = sorted(dates.values(), key=lambda x: x["date"], reverse=True)[:120]
    with open(ARCHIVE_INDEX, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    print(f"[archive] index updated: {len(idx)} days")

def main():
    ensure_dir(OUT_JSON)
    # archive yesterday from live site (so we keep history across runs)
    base = base_url_from_env()
    if base:
        write_archive_if_needed(base)

    items = collect()
    payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "total": len(items),
        "items": items
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"[OK] wrote {len(items)} items -> {OUT_JSON}")

if __name__ == "__main__":
    main()
