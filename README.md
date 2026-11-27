[![Turkey Run](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Rank](https://make.fun/badge/turkey-run-game-01/Iqblhkim/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Reward](https://make.fun/badge/turkey-run-game-01/Iqblhkim/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01)
# Turkey Run — Thanksgiving Escape

A 2D canvas side-view runner. You are a turkey on Thanksgiving morning,
running 1500 m from the Farmyard through the Barn to the Kitchen, outrunning
the farmer who wants you for dinner. Reach the forest and you are free.

## How to play

- The turkey runs on its own. Jump fences and hay bales, slide under low
  branches, dash through danger, and hide in a haystack when the farmer
  gets too close.
- Collect corn (+100, golden corn +250) and feathers (+50). Dodge mud (slows
  you), glowing ovens (jump them — standing in one costs a heart), falling
  carving knives (watch the red shadow warning), and pitchforks.
- 3 hearts. Lose them all — or let the farmer catch up — and you are CAUGHT.
  Reach 1500 m and you ESCAPE.

## Controls

| Key | Action |
| --- | --- |
| Space / ↑ / W | Jump (press again mid-air for a double jump) |
| ↓ / S | Slide under low branches |
| Shift | Dash (speed burst + brief invulnerability) |
| H | Hide in a nearby haystack (farmer loses the trail) |
| P | Pause |
| M | Mute |
| R | Restart from an end screen |
| Mouse / touch | Click START / RESTART buttons; click the canvas to jump |

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8080
# or build the entry dossier:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Tech

Plain canvas JavaScript, no libraries, no build step, no network requests.
All art is drawn with canvas primitives; all sound is synthesized with
WebAudio. Screenshots are deterministic staged scenes (`?shot=<name>&seed=<n>`).
