#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds site/data/news.json with up to 10 fresh senior-relevant items.
Sources include AARP, Next Avenue, KFF Health News, Medicare, SSA, NIA, CDC, NCOA, and FTC scams.
"""

import os, json, re, time, hashlib
from datetime import datetime, timezone
from urllib.parse import urlparse

import feedparser
import requests

OUT_JSON = os.path.join("site", "data", "news.json")
TIMEOUT = 12
UA = "RetirementBot-News/1.1 (+github-actions)"

FEEDS = [
    # Senior / aging focus
    "https://www.aarp.org/rss/aarp/everything.xml",
    "https://www.nextavenue.org/feed/",
    "https://www.kffhealthnews.org/topic/aging/feed/",
    "https://www.ncoa.org/news/articles/feed/",

    # Official program + health policy
    "https://blog.medicare.gov/feed/",
    "https://www.ssa.gov/newsroom/press-releases/rss.xml",
    "https://www.nia.nih.gov/news-events/newsroom/rss.xml",
    "https://tools.cdc.gov/api/v2/resources/media/403372.rss",  # CDC older adults topic feed
    "https://www.ftc.gov/feeds/consumerscams.xml"               # FTC scams (useful alerts)
]

def ensure_dir(p): os.makedirs(os.path.dirname(p), exist_ok=True)

def hostname(u):
    try:
        h = urlparse(u).hostname or ""
        return h.replace("www.", "")
    except Exception:
        return ""

def clean_html(s):
    if not s: return ""
    return re.sub(r"<[^>]+>", " ", s).replace("\xa0"," ").strip()

def ts_from_entry(e):
    for k in ("published_parsed","updated_parsed","created_parsed"):
        v = e.get(k)
        if v:
            try: return int(time.mktime(v))
            except Exception: pass
    return int(time.time())

def try_image(entry, page_url):
    # media tags
    for k in ("media_content","media_thumbnail"):
        v = entry.get(k)
        if isinstance(v, list) and v:
            u = v[0].get("url")
            if u: return u
    # image enclosure
    for link in entry.get("links", []):
        if link.get("rel") == "enclosure" and "image" in (link.get("type") or ""):
            return link.get("href")
    # OG image (best-effort, timeout guarded)
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

                item = {
                    "title": title,
                    "url": link,
                    "source": hostname(link),
                    "summary": clean_html(e.get("summary") or e.get("description") or ""),
                    "published_ts": ts_from_entry(e),
                    "image": None
                }
                item["image"] = try_image(e, link)
                items.append(item)
        except Exception as ex:
            print(f"[WARN] feed failed {url}: {ex}")

    # newest first and keep the top 10
    items.sort(key=lambda x: x["published_ts"], reverse=True)
    items = items[:10]

    # finalize timestamps
    for it in items:
        it["published"] = datetime.fromtimestamp(it["published_ts"], tz=timezone.utc).isoformat()

    return items

def main():
    ensure_dir(OUT_JSON)
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
