#!/usr/bin/env python3
"""Regenerate the figures for the TruckVitals regime-conditioning benchmark report, from the COMMITTED
artifacts (no recompute). Three figures:

  fig-mechanism.pdf - the detector-free effect size: the median fault signature measured in pooled
                      standard deviations against within-regime standard deviations, per C-MAPSS
                      subset, with the single-condition subsets returning exactly 1.00 as the
                      negative control nobody designed.
  fig-ladder.pdf    - the complete 12-rung ladder on the synthetic fleet, detection rate on the raw
                      and the residual arm at the same 1.0 false-alarm-per-truck-month budget,
                      grouped by tier. The two rungs conditioning HURTS are both learned.
  fig-budget.pdf    - the baked alarm-budget curves with bootstrap-over-units intervals for one rung
                      conditioning helps (pca-t2), one it leaves at ceiling (cusum) and one it hurts
                      (isolation-forest). An unreachable budget is a gap, not a zero.

Run:  python make_figs.py
Deps: matplotlib, numpy.  Reads ../../../data/artifacts/*.json.
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ART = ROOT / "data" / "artifacts"

RAW = "#4d6d8c"       # the raw arm
RES = "#c85a19"       # the residual (regime-conditioned) arm
GRID = dict(axis="y", color="0.85", lw=0.6, zorder=0)

plt.rcParams.update({
    "font.size": 8, "axes.titlesize": 8.5, "axes.labelsize": 8,
    "xtick.labelsize": 7.5, "ytick.labelsize": 7.5, "legend.fontsize": 7.5,
    "figure.dpi": 150, "savefig.bbox": "tight",
    "axes.spines.top": False, "axes.spines.right": False,
})


def fig_mechanism() -> None:
    m = json.load(open(ART / "cmapss_mechanism.json"))
    subsets: list[tuple[str, dict]] = []
    for pair in m["pairs"]:
        for name, s in pair["subsets"].items():
            subsets.append((name, s))
    subsets.sort(key=lambda t: t[0])

    fig, ax = plt.subplots(figsize=(3.5, 2.5))
    x = np.arange(len(subsets))
    for dx, key, lo, hi, color, label in [
        (-0.16, "median_d_pooled", "d_pooled_p10", "d_pooled_p90", RAW, "in pooled sigma"),
        (+0.16, "median_d_within_regime", "d_within_p10", "d_within_p90", RES, "in within-regime sigma"),
    ]:
        vals = np.array([s[key] for _, s in subsets])
        err = np.array([[s[key] - s[lo] for _, s in subsets], [s[hi] - s[key] for _, s in subsets]])
        ax.errorbar(x + dx, vals, yerr=err, fmt="o", ms=4, color=color, capsize=2, lw=1, label=label, zorder=3)
    for i, (name, s) in enumerate(subsets):
        ax.annotate(f"ratio {s['ratio']:.2f}" if s["ratio"] != 1.0 else "ratio 1.00 (control)",
                    (i, 0.045), ha="center", fontsize=6.5, color="0.35")
    ax.set_yscale("log")
    ax.set_ylim(0.03, 60)
    ax.set_xticks(x, [n for n, _ in subsets])
    ax.set_ylabel("median fault signature (sigma)")
    ax.grid(**GRID)
    ax.legend(frameon=False, loc="upper left")
    fig.savefig(HERE / "fig-mechanism.pdf")
    plt.close(fig)


TIER = {
    "shewhart": "classical", "cusum": "classical", "ewma": "classical", "page-hinkley": "classical",
    "pca-spe": "multivariate", "pca-t2": "multivariate",
    "bocpd": "streaming", "kswin": "streaming", "adwin": "streaming",
    "isolation-forest": "learned", "one-class-svm": "learned", "autoencoder": "learned",
}
TIER_ORDER = ["classical", "multivariate", "streaming", "learned"]


def fig_ladder() -> None:
    b = json.load(open(ART / "synthetic_benchmark.json"))
    byk = {(a["detector"], a["arm"]): a for a in b["arms"]}
    rungs = sorted({a["detector"] for a in b["arms"]}, key=lambda d: (TIER_ORDER.index(TIER[d]), d))

    fig, ax = plt.subplots(figsize=(3.5, 3.0))
    y = np.arange(len(rungs))
    raw = [byk[(d, "raw")]["detection_rate"] for d in rungs]
    res = [byk[(d, "residual")]["detection_rate"] for d in rungs]
    ax.barh(y - 0.19, raw, height=0.36, color=RAW, label="raw arm", zorder=3)
    ax.barh(y + 0.19, res, height=0.36, color=RES, label="residual arm", zorder=3)
    prev = None
    for i, d in enumerate(rungs):
        if TIER[d] != prev:
            if i:
                ax.axhline(i - 0.5, color="0.75", lw=0.6)
            ax.text(1.02, i, TIER[d], transform=ax.get_yaxis_transform(),
                    fontsize=6.5, color="0.35", va="center")
            prev = TIER[d]
    ax.set_yticks(y, rungs)
    ax.invert_yaxis()
    ax.set_xlim(0, 1.0)
    ax.set_xlabel("detection rate at 1.0 false alarm per truck-month")
    ax.grid(axis="x", color="0.85", lw=0.6, zorder=0)
    ax.legend(frameon=False, loc="lower right")
    fig.savefig(HERE / "fig-ladder.pdf")
    plt.close(fig)


def fig_budget() -> None:
    b = json.load(open(ART / "synthetic_benchmark.json"))
    curves = b["budget_curves"]
    grid = b["budget_grid_per_truck_month"]
    picks = [("pca-t2", "conditioning helps"), ("cusum", "already at ceiling"),
             ("isolation-forest", "conditioning hurts")]

    fig, axes = plt.subplots(1, 3, figsize=(7.0, 2.2), sharey=True)
    for ax, (det, subtitle) in zip(axes, picks):
        for arm, color in [("raw", RAW), ("residual", RES)]:
            cells = curves[det][arm]
            xs = [c["budget_per_truck_month"] for c in cells if c["reachable"]]
            ys = [c["detection_rate"] for c in cells if c["reachable"]]
            lo = [c["det_ci"][0] for c in cells if c["reachable"]]
            hi = [c["det_ci"][1] for c in cells if c["reachable"]]
            ax.plot(xs, ys, "o-", ms=3, lw=1.2, color=color, label=f"{arm} arm", zorder=3)
            ax.fill_between(xs, lo, hi, color=color, alpha=0.18, lw=0, zorder=2)
        ax.set_xscale("log")
        ax.set_xticks(grid, [str(g) for g in grid])
        ax.minorticks_off()
        ax.set_title(f"{det}\n({subtitle})")
        ax.set_xlabel("budget (FA per truck-month)")
        ax.grid(**GRID)
    axes[0].set_ylabel("detection rate")
    axes[0].set_ylim(-0.03, 1.03)
    axes[0].legend(frameon=False, loc="upper left")
    fig.savefig(HERE / "fig-budget.pdf")
    plt.close(fig)


if __name__ == "__main__":
    fig_mechanism()
    fig_ladder()
    fig_budget()
    print("wrote fig-mechanism.pdf, fig-ladder.pdf, fig-budget.pdf")
