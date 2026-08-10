"""One JSON writer for every artifact, because Python's default emits invalid JSON.

`json.dump` writes bare `NaN`, `Infinity` and `-Infinity` by default (`allow_nan=True`). None of the
three is valid JSON, and `JSON.parse` in every browser rejects the whole document on the first one. The
failure is total and silent from the pipeline's side: the file is written, the tests pass, the size looks
right, and the web page that fetches it dies with a syntax error.

That is exactly what happened here. `regime_coverage` is legitimately NaN on the raw arm, which has no
regime model, and four of those made `cmapss_regime_contrast.json` unparseable by the site that exists to
display it.

NaN becomes `null`, which the site already has to handle for genuinely absent values. Infinity is NOT
silently coerced: an infinite metric is a bug in the metric, not a missing value, and quietly writing
`null` would hide it.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

__all__ = ["clean", "dumps", "write_json", "assert_strict_json"]


def clean(obj: Any) -> Any:
    """Recursively replace NaN with None. Raises on an infinity."""
    if isinstance(obj, float):
        if math.isnan(obj):
            return None
        if math.isinf(obj):
            raise ValueError("an infinite value reached the artifact writer; fix the metric, not the "
                             "serialisation (a finite bound or None is a value, an infinity is a bug)")
        return obj
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean(v) for v in obj]
    return obj


def _default(o: Any) -> Any:
    # numpy scalars and arrays, without importing numpy at module scope.
    if hasattr(o, "item") and getattr(o, "ndim", None) == 0:
        return clean(o.item())
    if hasattr(o, "tolist"):
        return clean(o.tolist())
    return float(o)


def dumps(payload: Any, indent: int | None = 2) -> str:
    """Serialise to STRICT JSON. `allow_nan=False` makes any survivor an error rather than a silent
    non-JSON token, so this cannot regress to writing a file the browser refuses."""
    return json.dumps(clean(payload), indent=indent, allow_nan=False, default=_default)


def _reject_constant(name: str):
    raise ValueError(f"bare {name} is not valid JSON and every browser rejects the whole document")


def loads_strict(text: str) -> Any:
    """Parse with the SAME strictness a browser applies.

    `json.loads` accepts NaN and Infinity by default, so a naive round-trip check passes on exactly the
    files that break the site. `parse_constant` fires on all three tokens and is what makes this a real
    gate rather than a reassuring one.
    """
    return json.loads(text, parse_constant=_reject_constant)


def write_json(path: str | Path, payload: Any, indent: int | None = 2) -> Path:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    text = dumps(payload, indent=indent)
    loads_strict(text)  # parse what was actually produced, as a browser would, before it reaches disk
    p.write_text(text, encoding="utf-8")
    return p


def assert_strict_json(path: str | Path) -> None:
    """Fail loudly if a file on disk is not JSON a browser will accept."""
    loads_strict(Path(path).read_text(encoding="utf-8"))
