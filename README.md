# RR-ECU-Site

Website for **Electronic City United (ECU)** — *One City, One Community, One Family.*
Powered by RR International Group.

Live: https://asrithan22.github.io/RR-ECU-Site/

## Files

| Path                | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `index.html`        | Whole site — markup plus the hero and UI scripts             |
| `style.css`         | Design system and all section styling                        |
| `logo.png`          | ECU emblem — nav, footer, favicon, and the 3D hero texture   |
| `images/`           | Photo slots for the *What We Do* cards (see its README)      |

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
| Supporting | Green `#1E9E5A`, Orange `#E8722B` — accents only |
| Surfaces   | White `#FFFFFF`, soft grey `#F5F8FC` |

Every value is defined once as a custom property at the top of `style.css`.
Change it there and it propagates site-wide.

Two rules the design depends on:

- **No silver, faded grey, or low-opacity white text.** Text colours are solid
  and all clear 8:1 contrast against their background.
- **Sections alternate light and dark.** The order is navy hero → white →
  soft grey → navy → white → navy CTA. Inserting a section means keeping that
  rhythm going, not appending another dark block.

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
