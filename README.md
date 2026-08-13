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
| `logo-vivid.svg`         | Brighter emblem exploration, not yet in use — see below      |
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

ECU is **colourful, energetic and family-focused**. The palette is bright and
warm; navy is ink and structure, not the background.

| Role        | Colour                    |
| ----------- | ------------------------- |
| Ink         | Deep Navy `#071B33` — text and structure, **not** a page background |
| Cool accents| Blue `#2387E8`, Teal `#12B9A6`, Violet `#7C4DCC`, Cyan `#22B6D9` |
| Warm accents| Coral `#F2557F`, Amber `#F5B324`, Gold `#D4A64A`, Orange `#E8722B` |
| Growth      | Green `#1E9E5A`          |
| Surfaces    | White, soft grey `#F5F8FC`, mint `#F4FBFA`, peach `#FFF9F6` |

The cool accents are sampled from `logo.png` itself — cyan from the circuit
traces, violet from the fourth bar, green from the bars beside it. The warm
accents were added deliberately: a palette that is blue-cyan-violet end to end
reads corporate, and coral and amber are what make it read as a family event.
Teal bridges the two halves so the warm additions don't sit apart from the mark.

Every value is defined once as a custom property at the top of `style.css`.
Change it there and it propagates site-wide.

**Each section owns an accent.** `#vision` blue, `#ecosystem` coral, `#focus`
amber, `#whatwedo` violet, `#festival` teal, `#cta` gold. A section sets `--sec`
(the bright fill, for rules and bars) and `--sec-ink` (the darkened,
text-safe version). The eyebrow label and rule pick these up automatically —
never put `--sec` on text, it is far too light at small sizes.

Four rules the design depends on:

- **Keep the page light.** Surfaces run white → peach → mint → white → tinted →
  vivid gradient. Dark blocks are moments, not backgrounds: the 3D hero, the
  vivid CTA and the footer. Adding another full dark section undoes the whole
  direction.
- **No silver, faded grey, or low-opacity white text.** Text colours are solid
  and clear their background by a wide margin.
- **Fill and ink are chosen together, and measured.** White on a mid-tone accent
  fails — teal-600 gives 3.46:1, amber-600 2.81:1, coral-500 3.29:1. Light fills
  (`--amber-500`, `--gold-500`) carry `--navy-900`; only the `-700` fills carry
  white. `.focus-num` shows the pattern with `--fc` / `--fc-ink`.
- **Re-measure after moving a surface.** Lightening the vision card from navy to
  violet silently dropped its gold chip to 3.58:1. Changing a background means
  re-checking everything sitting on it.

## Logo exploration

`logo-vivid.svg` is a brighter alternative to `logo.png`, for review. **Nothing
uses it yet** — the site still ships the original everywhere.

It keeps the same shield silhouette already traced from `logo.png`'s alpha
channel (the outline the 3D badge extrudes), so the two stay in register. What
changes is the treatment: the navy body becomes violet-to-teal, the chrome bevel
becomes a light aurora rim, and the bar chart carries the full accent set.

To adopt it, swap the five `logo.png` references in `index.html`. Two caveats
before doing so:

- The **3D hero badge cannot use an SVG** — the texture loader needs a raster.
  Export a PNG at 375×395 to replace `logo.png`, then re-run
  `node tools/gen-logo-embed.js`.
- The wordmark is live text in Plus Jakarta Sans. That is fine on the web where
  the font is already loaded, but export to outlines before sending it to a
  printer.

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
