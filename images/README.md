# Photo slots

The six cards in the **What We Do** section each have a photo slot. Drop a file
here with the matching name and it appears automatically — no code change needed.

| File               | Card                            |
| ------------------ | ------------------------------- |
| `events.jpg`       | Events & Festivals              |
| `sports.jpg`       | Sports & Tournaments            |
| `workshops.jpg`    | Workshops & Mentorship          |
| `networking.jpg`   | Networking & Business Connect   |
| `awards.jpg`       | Awards & Recognition            |
| `family.jpg`       | Family Fun, Games & Activities  |

## Specification

- **Aspect ratio** 16:10 — the slot crops to centre, so keep the subject centred.
- **Size** 1200 × 750 px is plenty. Larger files only slow the page down.
- **Format** JPEG, quality ~80. Keep each file **under 250 KB**.
- **Content** real photographs from ECU events. Genuine community photos are the
  single biggest upgrade available to this page — stock imagery reads as generic
  and undercuts the premium direction.

A dark navy→accent gradient with a subtle grid renders in any slot that has no
file yet, so missing photos look deliberate rather than broken. The page is
safe to publish before the photos arrive.

## Changing a filename

Slots are wired in `index.html` via a CSS variable on each card:

```html
<article class="do-card" style="--i:1; --photo:url('images/events.jpg')">
```

Edit that path to point at any file you prefer.
