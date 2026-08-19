# Framework card, `torch` (optional, the GPU lane)

## What and why

PyTorch backs three rungs of the 14-rung ladder, all trained on healthy windowed features only:

- `regimecpd.AutoencoderDetector`, a small dense autoencoder scored by per-window mean squared
  reconstruction error (Sakurada and Yairi 2014, DOI 10.1145/2689746.2689747, `sakurada2014`).
- `regimecpd.DeepSVDDDetector`, One-Class Deep SVDD, scored by squared distance to a fixed
  hypersphere centre (Ruff et al., ICML 2018, PMLR 80, 4393-4402, `ruff2018`).
- `regimecpd.LSTMAutoencoderDetector`, the EncDec-AD LSTM encoder-decoder, scored by a Mahalanobis
  distance on the reconstruction-error vector (Malhotra et al., ICML 2016 Anomaly Detection
  Workshop, arXiv:1607.00148, `malhotra2016`).

The last two were added as a PAIR to test a hypothesis rather than for coverage: Deep SVDD is
boundary-shaped and the LSTM encoder-decoder is reconstruction-shaped, which are the two categories
the learned tier's conditioning result split along. The prediction was written down before either was
trained (`preregistration-deep-tier-2026-08-19.md` in the management repo).

## Install (exact, pinned)

torch is never pinned directly here: it arrives through the engine's extra.
`requirements-gpu.txt` pins `regimecpd[deep]==0.10.0`, which requires `torch>=2.0`.

```bash
python -m venv .venv        # the same .venv as the rest of the pipeline
# CUDA build first if you have one; plain pip resolves the CPU wheel, which also runs the rung:
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cu126
.venv/Scripts/python -m pip install -r requirements-gpu.txt
```

## Applying it here

Nothing in this repo imports torch. The pipeline constructs
`rc.AutoencoderDetector(window=10, hidden=(32, 8), epochs=60, seed=0)` in
`data-pipeline/truckvitals/lanes/synthetic_benchmark.py`, and the engine imports its backend lazily
inside `fit`. On a machine without torch the availability probe (which FITS the detector, because a
lazy backend makes construction succeed everywhere) lands the rung in the artifact's `skipped_rungs`
with the reason string; the bake does not crash. Training is seeded through `torch.manual_seed`.

The browser's live autoencoder is NOT torch: `frontend/src/engine/learned.ts` re-implements a small
dense autoencoder in TypeScript, trained per truck on its healthy baseline.

## Caveats / license

BSD-3-Clause. The network is small (a 10-sample window, hidden sizes 32 and 8, 60 epochs), so the CPU
wheel is sufficient to bake the rung; the CUDA build is about speed on larger sweeps, and the GPU is
never needed at request time because the deployed site is static.
