# Manuscripts

One technical report, authored from the committed artifacts and published on Zenodo.

## Regime Conditioning Recovers Detection, Not Localisation

An Honest Benchmark for Fault Onset on Load-Varying Fleet Telemetry.

- **Cite (concept DOI, always resolves to the latest version):**
  [10.5281/zenodo.22002431](https://doi.org/10.5281/zenodo.22002431)
- **This version (v1.0):** [10.5281/zenodo.22002432](https://doi.org/10.5281/zenodo.22002432),
  record at <https://zenodo.org/records/22002432>, CC-BY-4.0, published 2026-08-18.
- **Source:** [`regime-conditioning-benchmark/tex/main.tex`](regime-conditioning-benchmark/tex/main.tex)
  (IEEEtran, 5 pp). Built PDF committed at
  [`regime-conditioning-benchmark/main.pdf`](regime-conditioning-benchmark/main.pdf).
- **Figures:** [`regime-conditioning-benchmark/figures/make_figs.py`](regime-conditioning-benchmark/figures/make_figs.py)
  regenerates all three from `data/artifacts/*.json`; nothing is drawn from memory. Rebuild with
  `python make_figs.py` (matplotlib, in the dev requirements) then two `pdflatex` passes over
  `tex/main.tex`.

Every number in the report replays from the committed artifacts, its references are the product's
primary-source-verified citation registry, and the engine's defect record ships as the appendix,
because the honesty budget is part of the result. The report states the null (onset localisation),
the withdrawal (no false-alarm-reduction claim), and the counter-example (conditioning hurts the two
boundary-shaped learned novelty detectors) at the same volume as the successes.
