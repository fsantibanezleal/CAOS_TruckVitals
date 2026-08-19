# Guide, the GPU lane (optional)

Three rungs of the 14-rung ladder train a neural network, all constructed in
`data-pipeline/truckvitals/lanes/synthetic_benchmark.py`:

- `rc.AutoencoderDetector(window=10, hidden=(32, 8), epochs=60, seed=0)`, a dense autoencoder.
- `rc.DeepSVDDDetector(window=10, hidden=(32, 8), epochs=60, pretrain_epochs=30, seed=0)`.
- `rc.LSTMAutoencoderDetector(window=10, hidden=32, epochs=60, seed=0)`.

No other rung needs torch. This lane exists for those three.

## Install

`requirements-gpu.txt` pins `regimecpd[deep]==0.10.1`; the `[deep]` extra pulls `torch>=2.0`.

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

## Verifying that the GPU was actually used, which is not the same as installing it

Installing the CUDA wheel is not evidence that a bake used it, and for months this repo proved the
point: this guide described the lane while the pipeline venv held `torch+cpu`, so every published
autoencoder number was trained on CPU and nothing recorded that fact. `pip install torch` alone does
not fix it either, because pip sees torch already satisfied and keeps the CPU build:

```bash
.venv/Scripts/python -m pip uninstall -y torch
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cu126
.venv/Scripts/python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

Every trained rung now writes the device it actually used into its `Detection.meta`, and the lane
copies that into the artifact as the arm's `device` field: `cuda`, `cpu`, or `null` for a rung that
trains nothing. So the artifact answers "what hardware produced this number" instead of inviting the
reader to assume. Measured on this fleet, an RTX 4070 Laptop trains the dense autoencoder rung about
3.3 times faster than the CPU (1.40 s against 4.60 s for 60 epochs over 4000 windows) and reaches the
same final loss to five decimals.

## What it never touches

The committed artifacts are produced offline, so the deployed site never needs a GPU. The browser's
live autoencoder needs no torch either: `frontend/src/engine/learned.ts` is a separate TypeScript
implementation, trained per truck on its healthy baseline. Engine-side details:
the [torch card](../frameworks/02_torch/torch.md).
