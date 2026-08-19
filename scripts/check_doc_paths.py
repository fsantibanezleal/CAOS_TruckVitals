#!/usr/bin/env python3
"""Every repo path a doc names must exist. The gate the 2026-08-18 coherence audit showed was missing.

`check_template_residue.py` greps for known template tokens, so residue that names PLAUSIBLE but
nonexistent files sails through it: this repo's docs/ described a SIR engine, pyodide lanes and a
`data/derived/` tree for weeks while that gate stayed green, and only a four-agent audit that opened
the code caught it. This gate closes the class mechanically: it extracts everything that LOOKS like a
concrete repo path from every tracked markdown file, and fails if the path does not exist.

What counts as a path claim, deliberately conservative to keep false positives at zero:

- an inline code span whose text starts with a known top-level directory of THIS repo and ends in a
  known file extension (or `/` for a directory);
- a relative markdown link target (resolved against the linking file's directory, then against the
  repo root, matching how the docs actually resolve on GitHub).

What is deliberately NOT checked: engine-internal paths (`regimecpd/...` lives in another repo),
anything with a wildcard or `<placeholder>`, URLs, anchors, and build outputs (`frontend/dist/...`,
`.venv/...`) that only exist after a build. An exclusion here must earn its comment.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Top-level directories whose files a doc may claim. A span not starting with one of these is treated
# as prose (a command, a module name, an option), never as a path claim.
CHECKED_ROOTS = (
    "data-pipeline/", "frontend/", "docs/", "scripts/", "data/", "manuscripts/", "tests/", ".github/",
)

# Path-shaped spans that are legitimately unresolvable from this repo's tree.
EXCLUDED_PREFIXES = (
    "regimecpd/",        # the engine package: its files live in CAOS_RegimeCPD, not here
    "frontend/dist/",    # build output; exists only after `npm run build`
    "frontend/node_modules/",
    ".venv/",
    "data/raw/",         # gitignored by design: docs legitimately name it, a clean clone lacks it.
                         # Found by this gate's own first CI run: the path existed on the dev machine
                         # and not in the runner's checkout, a class Windows testing cannot see.
)

EXTENSIONS = (
    ".py", ".ts", ".tsx", ".mjs", ".json", ".md", ".yml", ".yaml", ".txt", ".toml", ".css",
    ".svg", ".pdf", ".tex", ".ps1", ".html",
)

SPAN_RE = re.compile(r"`([^`\n]+)`")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)")


def tracked_markdown() -> list[Path]:
    out = subprocess.run(["git", "ls-files", "*.md"], cwd=ROOT, capture_output=True, text=True,
                         check=True).stdout
    return [ROOT / line for line in out.splitlines() if line]


def is_path_claim(span: str) -> bool:
    if any(ch in span for ch in " *<>{}$|\\") or span.startswith(("http", "#")):
        return False
    if not span.startswith(CHECKED_ROOTS):
        return False
    if span.startswith(EXCLUDED_PREFIXES):
        return False
    return span.endswith(EXTENSIONS) or span.endswith("/")


def main() -> int:
    misses: list[str] = []
    for md in tracked_markdown():
        text = md.read_text(encoding="utf-8")
        rel_md = md.relative_to(ROOT).as_posix()

        for span in SPAN_RE.findall(text):
            span = span.strip()
            if is_path_claim(span) and not (ROOT / span).exists():
                misses.append(f"{rel_md}: `{span}` does not exist")

        for target in LINK_RE.findall(text):
            if target.startswith(("http://", "https://", "mailto:")):
                continue
            t = target.strip()
            if any(ch in t for ch in "*<>{}$"):
                continue
            if t.startswith(EXCLUDED_PREFIXES):
                continue
            resolved_local = (md.parent / t).resolve()
            resolved_root = (ROOT / t).resolve()
            if not resolved_local.exists() and not resolved_root.exists():
                misses.append(f"{rel_md}: link target '{t}' does not exist")

    if misses:
        print(f"check_doc_paths: {len(misses)} path claim(s) name files that do not exist:")
        for m in misses:
            print(f"  {m}")
        return 1
    print("check_doc_paths: OK, every repo path the docs name exists.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
