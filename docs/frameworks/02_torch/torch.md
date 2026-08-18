# Framework card, `torch` (optional, the GPU lane)

## What and why

PyTorch backs exactly one rung of the 12-rung ladder: `regimecpd.AutoencoderDetector`, a small dense
autoencoder trained on healthy windowed features only, whose statistic is the per-window mean squared
reconstruction error (primary reference Sakurada and Yairi 2014, DOI 10.1145/2689746.2689747, cited
as `sakurada2014` in the App's citation registry). The rung matters to the product beyond
completeness: on the baked run it is the only LEARNED rung where conditioning helps (0.75 raw to 1.00
residual), against isolation forest and one-class SVM where conditioning hurts.

## Install (exact, pinned)

torch is never pinned directly here: it arrives through the engine's extra.
`requirements-gpu.txt` pins `regimecpd[deep]==0.9.6`, which requires `torch>=2.0`.

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
