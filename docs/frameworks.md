# Frameworks

One card per research-chosen engine, the deep research made binding. Every engine the pipeline uses
gets a card here AND an exact pin in the matching requirements file. No hand-rolled substitute for an
engine the research prescribed.

- [01, regimecpd](frameworks/01_regimecpd/regimecpd.md): the regime-conditional change-point engine,
  pinned `==0.9.6` in all three requirements files: base in `requirements.txt`, `[learned]` in
  `requirements-precompute.txt`, `[deep]` in `requirements-gpu.txt`.
- [02, torch](frameworks/02_torch/torch.md): the optional GPU lane. Arrives through
  `regimecpd[deep]`, backs exactly one rung of the ladder, the autoencoder.
