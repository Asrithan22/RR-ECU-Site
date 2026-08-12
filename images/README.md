# Card artwork

The six cards in the **What We Do** section each have an image slot. Every slot
currently holds a brand-palette **illustration** so the section looks finished,
but a real photograph beats an illustration every time — see *Replacing with
photos* below.

| File                | Card                            | Illustration              |
| ------------------- | ------------------------------- | ------------------------- |
| `events.svg`        | Events & Festivals              | stage lights over a crowd |
| `sports.svg`        | Sports & Tournaments            | trophy, chessboard, ball  |
| `workshops.svg`     | Workshops & Mentorship          | cap, books, idea bulb     |
| `networking.svg`    | Networking & Business Connect   | connected people          |
| `awards.svg`        | Awards & Recognition            | medal and stars           |
| `family.svg`        | Family Fun, Games & Activities  | family with balloons      |

Each illustration is a hand-authored SVG under 2.5 KB, drawn on the same navy
base with the card's own accent as a corner glow, so it sits correctly under the
grid and scrim the CSS lays over the top. Keep the focal subject in the upper
two-thirds — the bottom is darkened and the icon badge sits at bottom-left.

## Replacing with photos

Drop your file in here and update the one path in `index.html`:

```html
<article class="do-card" style="--photo:url('images/events.jpg')">
```

Real photographs from ECU events remain the single biggest upgrade available to
this page. The illustrations exist so the section never looks unfinished while
you gather them — they are not the destination.

## Specification

- **Aspect ratio** 16:10 — the slot crops to centre, so keep the subject centred.
- **Size** 1200 × 750 px is plenty. Larger files only slow the page down.
- **Format** JPEG, quality ~80. Keep each file **under 250 KB**.
- **Content** real photographs from ECU events. Genuine community photos are the
  single biggest upgrade available to this page — stock imagery reads as generic
  and undercuts the premium direction.

A dark navy→accent gradient with a subtle grid also sits behind every slot, so
even a broken or missing path degrades to something deliberate rather than an
empty box.
