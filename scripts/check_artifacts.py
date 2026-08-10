"""Validate the pipeline-to-web artifact contract on disk. Stdlib only, so CI can run it without installing anything.

Three classes of failure this catches, all of which have actually happened in this repo:

1. **A file the site requires is missing.** The site would render an empty panel where a measured result
   belongs, which is worse than a broken build because it ships looking finished.
2. **A file is not JSON a BROWSER accepts.** Python writes bare `NaN` by default and reads it back
   happily, so a naive round-trip check passes on exactly the file that kills the site. One NaN in a
   metadata field takes down every number in the document.
3. **The fleet index and the fleet traces disagree.** The index drives the truck selector; a unit listed
   there with no trace file is a selector entry that 404s when a reader picks it.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "data" / "artifacts"

REQUIRED = {
    "cmapss_mechanism.json": "the detector-free headline measurement",
    "cmapss_regime_contrast.json": "the detection contrast at a matched budget",
    "aps_cost.json": "the SCANIA APS cost decision",
    "componentx.json": "the SCANIA Component X failure-window decision",
    "synthetic_benchmark.json": "the full detector ladder on the synthetic fleet",
    "onset_seed_sweep.json": "the paired multi-seed onset null",
    "fleet/index.json": "the per-truck trace index the App's selector is built from",
}


def _reject(name: str):
    raise ValueError(f"bare {name} is not valid JSON; every browser rejects the whole document")


def load_strict(path: Path):
    """Parse with the strictness a browser applies, not the strictness Python defaults to."""
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=_reject)


def main() -> int:
    errs: list[str] = []

    if not ARTIFACTS.exists():
        print(f"FAIL: missing {ARTIFACTS}; run the data-pipeline runners first")
        return 1

    for rel, why in REQUIRED.items():
        p = ARTIFACTS / rel
        if not p.exists():
            errs.append(f"missing {rel} ({why})")
        elif p.stat().st_size == 0:
            errs.append(f"empty {rel}")

    for p in sorted(ARTIFACTS.rglob("*.json")):
        try:
            load_strict(p)
        except ValueError as e:
            errs.append(f"{p.relative_to(ARTIFACTS)}: {e}")

    index_path = ARTIFACTS / "fleet" / "index.json"
    if index_path.exists() and not errs:
        index = load_strict(index_path)
        listed = [u["unit_id"] for u in index.get("units", [])]
        if not listed:
            errs.append("fleet/index.json lists no units, so the App would have an empty selector")
        for uid in listed:
            trace = ARTIFACTS / "fleet" / f"{uid}.json"
            if not trace.exists():
                errs.append(f"fleet/index.json lists {uid} but fleet/{uid}.json does not exist")
        on_disk = {p.stem for p in (ARTIFACTS / "fleet").glob("*.json")} - {"index"}
        for extra in sorted(on_disk - set(listed)):
            errs.append(f"fleet/{extra}.json exists but is not listed in the index, so nothing can reach it")

        cfg = index.get("config", {})
        kept = cfg.get("n_units_kept")
        if kept is not None and kept != len(listed):
            errs.append(f"index config says {kept} units kept but lists {len(listed)}")

    for e in errs:
        print(f"FAIL: {e}")
    if errs:
        return 1

    n_units = len(load_strict(index_path).get("units", [])) if index_path.exists() else 0
    print(f"OK: {len(REQUIRED)} required artifacts present, every JSON file is browser-parseable, "
          f"{n_units} truck traces consistent with the index")
    return 0


if __name__ == "__main__":
    sys.exit(main())
