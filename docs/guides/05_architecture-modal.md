# Guide, the in-app Architecture modal (ADR-0058)

Every CAOS web app ships an in-app Architecture / "How it works" modal, opened by an always-visible
info button in the header. It is the fast visual proof the app is a real, complete system. The chrome
(button plus modal) comes from the shared shell; this product supplies only its diagrams and copy.
Binding decision: ADR-0058, in the private
[management repo](https://github.com/fsantibanezleal/CAOS_MANAGE).

## How it is wired here

- `@fasl-work/caos-app-shell` is pinned `^0.5.0` in `frontend/package.json`. The shell renders the
  info button whenever the `ShellConfig` carries an `architecture` field, and hides it when absent.
- The config is `frontend/src/architecture.ts`, exporting `architecture: ArchitectureConfig`:
  bilingual titles plus five tabs, each pairing one SVG with an EN/ES body. `frontend/src/main.tsx`
  passes it into the shell config.
- The SVGs live in `frontend/public/svg/tech/` and are fetched and INLINED by the shell. Inlining is
  what lets every colour in them be a shell CSS variable (`--color-surface`, `--color-accent`,
  `--color-fg`, ...) so the diagram repaints with the active light/dark theme; an `<img>` could not.

## The five tabs this product ships

| id | tab (EN) | SVG | what it shows |
|---|---|---|---|
| `what` | What this is | `01-the-idea.svg` | the one question the product asks: anomalous FOR THE OPERATING REGIME; the context/monitored split |
| `lanes` | The four lanes | `02-lanes.svg` | which claim each data lane supports, and each lane's declared limit |
| `flow` | How the site runs | `03-web-flow.svg` | offline bake to committed artifacts to build overlay; nothing typed into a page |
| `science` | The protocol | `04-the-protocol.svg` | matched budgets, event-counted alarms, unit-level bootstrap, nothing fitted on what it judges |
| `honesty` | What was wrong | `05-what-was-wrong.svg` | the adversarial review: the three broken figures, the withdrawn claim, the onset null |

The ids deviate from the archetype's generic set (`app`/`lanes`/`web-flow`/`science`/`design`) on
purpose: the generic design tab's slot is spent on `honesty`, the adversarial-review record, which for
this product is the more load-bearing content. Five tabs is the ADR floor either way.

## For the next product

Author `frontend/src/architecture.ts` directly (the archetype's old `architecture.ts.txt` scaffold no
longer exists, and `scripts/check_template_residue.py` forbids the `.ts.txt` suffix outright), draw
one themed SVG per tab, and pass `architecture` into the `ShellConfig`:

```ts
import { architecture } from './architecture.ts';

const config: ShellConfig = {
  product: { name: 'TruckVitals', mark: <Truck size={18} aria-hidden="true" /> },
  routes: [/* ... */],
  version: pkg.version,   // single source: frontend/package.json
  architecture,           // presence of this field turns the info button on
};
```

## Verify before deploy

The screenshot-verify pass (mandatory before any deploy) must open the modal and confirm every tab
renders its diagram (themed, no broken SVG) and its text with no error, in both light and dark. A
product is not done without the Architecture modal at full depth.
