[![Emberwing Air — make.fun entry](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/cashbags/makefun-best-flight-game-20261126-0057/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/cashbags/makefun-best-flight-game-20261126-0057/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

# Emberwing Air

Bush-pilot island hops across the volcanic Kaldera archipelago — **12 islands, 9 missions, 5 aircraft, 3 weather fronts, fuel + damage, 8 rings, day/night legs**.

Fly the mail, rescue the lighthouse keeper, race eight rings over the inner sea, survey three live craters, and cross a storm front on half tanks. Throttle discipline pays: burn fuel too fast and you glide home; come down too hard and the airframe keeps the score.

## Play

Serve `game/` and open it in a desktop browser — no build step, no network:

```sh
node serve.ts
# open http://localhost:8080
```

- **W/S** throttle · **↑/↓** pitch · **←/→** or **A/D** bank & turn · **G** gear · **C** cockpit view · **P** pause · **M** mute · drag the mouse to look around
- Pick a mission on the title screen, pick one of the five aircraft on the briefing screen, and follow the beacon. Land on the strip (or the beach, for a pickup) and come to a stop to complete a leg.
- Deterministic screenshot scenes: `?shot=cover|cockpit|landing|complete&seed=20261126`

## The game

- **12 islands** with beaches, grass, rock and volcanic craters, cut from one seeded heightmap — the same seed always builds the same archipelago.
- **9 missions** with different goals: deliveries, a rescue, an 8-ring race, crater surveys, a night-mail leg, a storm crossing, a fuel-tight run, and a 6-leg grand tour.
- **5 aircraft** (Kite trainer, Gull STOL, Petrel cargo, Tern racer, Albatross heavy) with different cruise speed, stall speed, fuel burn, toughness and turn rate.
- **3 weather fronts** (Clear Trades, Trade Winds, Storm Front) with crosswind, gusts, turbulence, fog and rain that push the aircraft around.
- **Fuel + damage** that turn every sortie into decisions; stall, hard landings, ditching and airframe limits all read as what happened.
- **Day/night legs** — dusk and night change the light, the fog and what the runway lamps mean.
- **Instruments that look flown**: altitude, speed, heading, vertical speed, throttle, fuel and damage gauges, a compass strip, an artificial horizon, and a lit cockpit view.
- **Sounds** synthesized with WebAudio — engine hum follows the throttle, wind follows the speed, chimes mark rings and landings. No audio files.
- **Three.js** vendored as `game/vendor/three/three.module.min.js` (0.160.0, single-file minified build); everything else is original code written for this entry.

## Entry

This repository is an entry for [best-flight-game-20261126-0057](https://make.fun/c/best-flight-game-20261126-0057) on make.fun. `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Build with make.fun: https://make.fun/r/qrg7fvky
