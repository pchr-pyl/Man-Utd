"""Merge fbref per-match stat tables into data/man-utd-matchlogs.json.

Input: data/raw/matchlog-YYYY-YYYY-{shooting,keeper,misc}.json — each holds
{tables: [{label, columns, rows}], metadata:{sourceURL}} serialized from the
"For Manchester United" / "Against Manchester United" tables on fbref.

Output shape:
{
  "1992-1993": {
    "shooting": {"for": {"columns": [...], "rows": [[...]]},
                 "against": {...}},
    "keeper": {...},
    "misc": {...}
  }
}
Rows stay as string arrays aligned to `columns` (fbref reuses names like GA,
so objects keyed by header would collide).
"""

import json
import re
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
OUT = Path(__file__).resolve().parent.parent / "data" / "man-utd-matchlogs.json"
ATTACK_OUT = Path(__file__).resolve().parent.parent / "data" / "man-utd-attack.json"
ATTACK_LEAGUE_OUT = (
    Path(__file__).resolve().parent.parent / "data" / "man-utd-attack-league.json"
)
PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

FILE_RE = re.compile(r"matchlog-(\d{4}-\d{4})-(shooting|keeper|misc)\.json")


def main():
    seasons = {}
    files = sorted(
        p for p in RAW.glob("matchlog-*.json") if FILE_RE.fullmatch(p.name)
    )
    for f in files:
        season, typ = FILE_RE.fullmatch(f.name).groups()
        d = json.loads(f.read_text(encoding="utf-8"))
        sides = {}
        for t in d.get("tables", []):
            label = t.get("label", "")
            if label.startswith("For"):
                side = "for"
            elif label.startswith("Against"):
                side = "against"
            else:
                continue
            sides[side] = {"columns": t["columns"], "rows": t["rows"]}
        seasons.setdefault(season, {})[typ] = sides
        print(f"{season} {typ}: for={len(sides.get('for', {}).get('rows', []))} "
              f"against={len(sides.get('against', {}).get('rows', []))}")

    OUT.write_text(
        json.dumps(seasons, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {len(seasons)} seasons -> {OUT} "
          f"({OUT.stat().st_size // 1024} KB)")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for season, types in seasons.items():
        (PUBLIC_DIR / f"matchlogs-{season}.json").write_text(
            json.dumps(types, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    print(f"wrote {len(seasons)} per-season files -> {PUBLIC_DIR}")

    attack = build_attack(seasons)
    ATTACK_OUT.write_text(
        json.dumps(attack, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote attack aggregates -> {ATTACK_OUT}")

    attack_league = build_attack(seasons, comp="Premier League")
    ATTACK_LEAGUE_OUT.write_text(
        json.dumps(attack_league, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote league-only attack aggregates -> {ATTACK_LEAGUE_OUT}")


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def build_attack(seasons, comp=None):
    """Per-season attacking aggregates from the shooting 'for' tables.

    comp: when set, only rows whose Comp column matches are counted.
    """
    out = {}
    for season, types in seasons.items():
        t = types.get("shooting", {}).get("for")
        if not t:
            continue
        ix = {}
        for i, c in enumerate(t["columns"]):
            ix.setdefault(c, i)  # first occurrence wins (dup headers like GA)
        rows = t["rows"]
        if comp is not None:
            ci = ix.get("Comp")
            if ci is None:
                continue
            rows = [r for r in rows if ci < len(r) and r[ci] == comp]
        if not rows:
            continue
        mp = len(rows)

        def col(name):
            i = ix.get(name)
            return [num(r[i]) if i is not None and i < len(r) else None
                    for r in rows]

        def s(vals):
            vals = [v for v in vals if v is not None]
            return round(sum(vals), 2) if vals else None

        sh = col("Sh")
        cov = sum(1 for v in sh if v is not None) / mp if mp else 0
        out[season] = {
            "mp": mp,
            "gls": s(col("Gls")),
            "sh": s(sh),
            "sot": s(col("SoT")),
            "pk": s(col("PK")),
            "pkatt": s(col("PKatt")),
            "shCoverage": round(cov, 2),
        }
    return out


if __name__ == "__main__":
    main()
