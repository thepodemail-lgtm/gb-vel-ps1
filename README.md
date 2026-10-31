# GB Vel and the Shami Secret: PS1 test

A small browser 3D demo of a walkable forest clearing in a mid-1990s PlayStation-style look (low-poly, nearest-filtered low internal resolution, fog, vertex snap).

**Play:** https://thepodemail-lgtm.github.io/gb-vel-ps1/

Original content from Daniel’s *GB Vel* / Mahabharata exile story. Models are built from primitives in code. The demo copies the *era’s general look only* — no characters, arenas, music, or names from Battle Arena Toshinden or any other existing game.

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move | WASD / arrows | Left joystick |
| Attack | Z or J | ATTACK |
| Block | X or K | BLOCK |
| Pause | P | — |

First tap on a phone requests fullscreen and landscape lock.

## Tech

- Three.js (jsDelivr CDN), vanilla JS, no build step
- Tweakables in `js/tuning.js` with plain-English comments
- Original WebAudio SFX (sword, hit, bark); quiet optional drone music

## Local

Open `index.html` via any static server (GitHub Pages, or `python3 -m http.server`).
