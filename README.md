# RR-ECU-Site

Website for **Electronic City United (ECU)** — *One City, One Community, One Family.*
Powered by RR International Group.

Live: https://asrithan22.github.io/RR-ECU-Site/

## Files

| Path                     | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `index.html`             | Whole site — markup plus the hero and UI scripts             |
| `style.css`              | Design system and all section styling                        |
| `logo.png`               | ECU emblem — nav, footer, favicon, and the 3D hero texture   |
| `logo-embed.js`          | Generated. `logo.png` as a data URI, used only as a fallback |
| `tools/gen-logo-embed.js`| Regenerates `logo-embed.js`                                  |
| `images/`                | Photo slots for the *What We Do* cards (see its README)      |

**If you replace `logo.png`, regenerate the embedded copy:**

```bash
node tools/gen-logo-embed.js
```

Skipping this leaves the old artwork on the 3D badge whenever the page is opened
from `file://`. See [Hero](#hero) for why the fallback exists.

Static site, no build step. Open `index.html`, or serve the folder:

```bash
python -m http.server 8000
```

## Brand palette

| Role       | Colour                    |
| ---------- | ------------------------- |
| Primary    | Deep Navy `#071B33`       |
| Secondary  | Electric Blue `#2387E8`   |
| Accent     | Gold `#D4A64A`            |
| Supporting | Green `#1E9E5A`, Cyan `#22B6D9`, Orange `#E8722B`, Violet `#7C4DCC` |
| Surfaces   | White `#FFFFFF`, soft grey `#F5F8FC` |

Every supporting hue is sampled from `logo.png` itself — cyan from the circuit
traces, violet from the fourth bar, green and orange from the bars beside it —
so the emblem and the page share one palette instead of two that nearly match.

Every value is defined once as a custom property at the top of `style.css`.
Change it there and it propagates site-wide.

**Each section owns an accent.** `#vision` blue, `#ecosystem` cyan, `#focus`
gold, `#whatwedo` violet, `#festival` green, `#cta` gold. A section sets `--sec`
(the bright fill, for rules and bars) and `--sec-ink` (the darkened,
text-safe version). The eyebrow label and rule pick these up automatically —
never put `--sec` on text, it is far too light at small sizes.

Three rules the design depends on:

- **No silver, faded grey, or low-opacity white text.** Text colours are solid
  and all clear 8:1 contrast against their background.
- **Bright fills carry navy ink, not white.** The festival chips and gold
  buttons use `--navy-900` on top; white on a mid-tone accent fails contrast.
- **Sections alternate light and dark.** The order is navy hero → white →
  soft grey → navy → white → tinted light (festival) → navy CTA. Inserting a
  section means keeping that rhythm going, not appending another dark block.

## Typography

Plus Jakarta Sans for headings, Inter for body — both from Google Fonts.

## Hero

The hero is a scroll-driven three.js sequence: camera pulls from street level to
aerial while the ECU badge rotates and rooftop circuit links illuminate.

It is **skipped automatically** — replaced by a styled static hero — when the
viewport is under 820px, the visitor prefers reduced motion, or WebGL is
unavailable. Nothing to configure.

## Photos

The six *What We Do* cards have photo slots. Drop correctly-named files into
`images/` and they appear; until then a designed navy gradient renders in their
place. See [`images/README.md`](images/README.md) for names and specs.

## Deployment

GitHub Pages serves `main` from the repository root. Push to `main` and the live
site updates within a minute or two.
