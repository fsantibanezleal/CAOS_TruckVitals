# Guide, the GPU lane (optional)

One rung of the 12-rung ladder trains a neural network: the autoencoder,
`rc.AutoencoderDetector(window=10, hidden=(32, 8), epochs=60, seed=0)` in
`data-pipeline/truckvitals/lanes/synthetic_benchmark.py`. No other rung needs torch. This lane exists
for that one rung.

## Install

`requirements-gpu.txt` pins `regimecpd[deep]==0.9.6`; the `[deep]` extra pulls `torch>=2.0`.

```bash
python -m venv .venv        # the same .venv the rest of the pipeline uses
# CUDA build first if you have one; skipping this line gets the CPU wheel, which also runs the rung:
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cu126
.venv/Scripts/python -m pip install -r requirements-gpu.txt
```

Then re-bake the ladder: `run_synthetic_benchmark.py` (and `run_parity.py` if the engine version
moved; see [guide 01](01_precompute-pipeline.md)).

## What happens without it

The bake does not crash and the rung does not silently vanish. The engine imports torch lazily inside
`fit`, so the availability probe in `synthetic_benchmark.py` FITS each detector rather than merely
constructing it, and an unavailable rung lands in the artifact's `skipped_rungs` with its reason
string. `ladder_declared` against `ladder_run` makes a silently partial ladder impossible.

## What it never touches

The committed artifacts are produced offline, so the deployed site never needs a GPU. The browser's
live autoencoder needs no torch either: `frontend/src/engine/learned.ts` is a separate TypeScript
implementation, trained per truck on its healthy baseline. Engine-side details:
the [torch card](../frameworks/02_torch/torch.md).
