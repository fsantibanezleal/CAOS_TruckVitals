"""Every committed artifact must parse as JSON a BROWSER accepts, not just as JSON Python accepts.

This gate exists because the two are not the same and the difference shipped. Python's `json.dump`
writes bare `NaN` by default and its `json.load` reads it back happily, so a naive round-trip test passes
on precisely the file that kills the site. `cmapss_regime_contrast.json` carried four of them, from a
`regime_coverage` that is legitimately NaN on the raw arm, which has no regime model.

The whole document fails on the first such token, so one NaN in a metadata field takes down every number
in the file.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "data-pipeline"))

from pipeline.jsonio import clean, dumps, loads_strict  # noqa: E402

ARTIFACTS = REPO_ROOT / "data" / "artifacts"


def artifact_files() -> list[Path]:
    return sorted(ARTIFACTS.rglob("*.json"))


def test_there_are_artifacts_to_check():
    # A gate that silently checks nothing is worse than no gate: it reports green.
    files = artifact_files()
    assert files, f"no artifacts under {ARTIFACTS}; the pipeline runners have not been executed"
    names = {f.name for f in files}
    for required in ("cmapss_regime_contrast.json", "aps_cost.json", "componentx.json",
                     "synthetic_benchmark.json", "onset_seed_sweep.json", "index.json"):
        assert required in names, f"{required} is missing from data/artifacts"


@pytest.mark.parametrize("path", artifact_files(), ids=lambda p: str(p.relative_to(ARTIFACTS)))
def test_artifact_is_strict_json(path: Path):
    loads_strict(path.read_text(encoding="utf-8"))


def test_the_gate_actually_rejects_nan():
    # Guards the guard. If loads_strict ever loses parse_constant this test fails rather than the gate
    # quietly going green on everything.
    with pytest.raises(ValueError):
        loads_strict('{"x": NaN}')
    with pytest.raises(ValueError):
        loads_strict('{"x": Infinity}')
    # ...and a NaN inside a STRING is fine, which is why a plain substring search is the wrong gate.
    assert loads_strict('{"note": "NaN handled natively"}') == {"note": "NaN handled natively"}


def test_writer_maps_nan_to_null_and_refuses_infinity():
    assert clean(float("nan")) is None
    assert loads_strict(dumps({"a": float("nan"), "b": [1.0, float("nan")]})) == {"a": None, "b": [1.0, None]}
    with pytest.raises(ValueError, match="infinite"):
        dumps({"a": float("inf")})
