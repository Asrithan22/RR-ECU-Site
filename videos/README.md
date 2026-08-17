# Video slots

Two places on the page take video. **Both are empty right now** and both fall
back to animated cartoon artwork, so the page is complete without them — drop a
file in with the matching name and it takes over automatically. No code change.

| File           | Where                  | Falls back to                |
| -------------- | ---------------------- | ---------------------------- |
| `hero.mp4`     | Behind the banner copy | the light sky + 3D badge     |
| `festival.mp4` | Festival section       | `images/cartoon-festival.svg`|

## How the fallback works

The `<video>` starts hidden. A script waits for the browser to confirm it can
actually play the file, and only then reveals it. So a missing file, an
unsupported codec or a blocked autoplay all end the same way — you keep the
artwork, and never get a black rectangle where a video should be.

## Specification

- **Format** MP4 (H.264 + AAC). Add a `.webm` beside it if you want the smaller
  file for Chrome and Firefox; the markup already lists both sources.
- **`hero.mp4`** 1920×1080, **silent**, 10–20 seconds, seamless loop. It plays
  muted and looping behind the headline, so it must be calm — slow drone or
  crowd-wide shots. Anything with hard cuts fights the text.
- **`festival.mp4`** 1600×900, 16:9, 20–60 seconds. This one has controls, so it
  can have sound and cuts.
- **Size** keep `hero.mp4` under 3 MB. It loads on every visit, on phones, on
  mobile data. `festival.mp4` only loads when played (`preload="none"`), so it
  can be larger — under 20 MB is sensible.

## Why the hero video is muted and looping

Browsers block autoplay with sound, so an unmuted hero video simply would not
start. Muted autoplay is the only version that plays reliably, and it is also
the polite one — a page that makes noise on load is a page people close.
