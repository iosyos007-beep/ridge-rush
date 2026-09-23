# Ridge Rush

An original 2D side-scrolling physics driving game in the "hill-climb" genre, built with
TypeScript, Vite, and Phaser 3 (Matter.js physics). No ads, no real-money purchases — coins
are earned only by playing. All names, characters, vehicles and art are original.

Two-input controls: hold **GAS** to drive forward / pitch the nose up in the air, hold
**BRAKE** to reverse / pitch the nose down in the air.

## Requirements

- Node.js 18+ and npm

## Getting started

```bash
npm install
npm run dev       # start the Vite dev server (http://localhost:5173)
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build locally
npm run typecheck # tsc --noEmit
npm run lint      # ESLint over src/ and test/
npm run test      # run the Vitest unit test suite once
```

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Gas (drive forward / air: nose up) | Right Arrow or `D` | Bottom-right pedal |
| Brake (reverse / air: nose down) | Left Arrow or `A` | Bottom-left pedal |
| Pause | `Esc` | Pause button (top-right) |

The game also auto-pauses when the browser tab loses focus.

## Project structure

```
src/
  main.ts              Phaser game bootstrap (Matter physics config, scale, auto-pause)
  config/              Data-driven config: vehicles, stages, balance constants
  scenes/              BootScene, MenuScene, GameScene, HUDScene, ResultsScene
  systems/             TerrainGenerator, VehicleFactory, FuelSystem, CoinSystem,
                       CameraController, CrashDetector, SaveManager, ParallaxBackground,
                       TerrainHeightField (pure, testable terrain math)
  entities/            Vehicle (chassis + wheels + ragdoll driver), Pickup
test/                  Vitest unit tests (SaveManager, TerrainHeightField)
```

## How the physics feel is tuned

All vehicle "feel" lives in [`src/config/vehicles.ts`](src/config/vehicles.ts) — no engine
code needs to change to retune a vehicle. Key knobs, and what we learned tuning them:

- **`engineTorque`** is how fast a driven wheel's angular velocity ramps toward
  `maxWheelSpeed` *per physics step*. Because Matter.js expresses angular velocity as
  radians-per-step (not per second), small-looking numbers are actually very fast — the
  initial value of `0.62` snapped wheels to full speed in ~4 steps (well under a tenth of a
  second) and threw the chassis around violently. `0.09` gives a smooth, controllable
  ramp-up over roughly half a second.
- **`airControlTorque`** rotates the chassis while airborne so the player can level out for a
  landing. It is applied every physics step while gas/brake is held, so it must be small
  (`0.012`) and the resulting angular velocity is clamped (±`0.06` rad/step in
  `Vehicle.applyInput`) — otherwise held input keeps accelerating the spin indefinitely and
  the car flips all the way over before you can react.
- **Suspension** (`suspensionStiffness`/`suspensionDamping`/`suspensionRestLength`) is a
  Matter distance constraint from the chassis to each wheel. A **second, horizontally-offset
  "guide" constraint** is added per wheel in `Vehicle.ts` — a plain single-point distance
  constraint only resists stretching along its own axis, so under wheel-motor torque a wheel
  can swing sideways like a pendulum and drag the whole chassis out of shape. The guide
  constraint triangulates the wheel's position against a second anchor point so it stays
  roughly directly below its mount while still compressing vertically over bumps.
- Wheels are spawned already extended to `suspensionRestLength` below their mount point (not
  spawned at zero distance) so the suspension constraint doesn't snap taut on the very first
  physics step. The same pattern applies to the ragdoll driver's torso/neck joints.

## Adding a new vehicle (config only)

Open [`src/config/vehicles.ts`](src/config/vehicles.ts), add a new object shaped like
`VehicleConfig` (copy `STARTER_JEEP` as a starting point), and push it into the `VEHICLES`
array. No other code needs to change — `VehicleFactory`, the garage, and stat displays all
read from this config. Fields you'll typically tweak:

- `mass`, `chassisWidth`/`chassisHeight`, `wheelRadius`, `wheelOffsetX`/`wheelOffsetY` —
  shape and geometry.
- `engineTorque`, `maxWheelSpeed`, `driveType` — how it accelerates.
- `suspensionStiffness`, `suspensionDamping`, `suspensionRestLength` — ride feel.
- `tireFriction`, `airControlTorque`, `centerOfMassOffsetY` — grip and air control.
- `color`, `accentColor` — procedural rendering tint (no sprite assets required).

## Adding a new stage (config only)

Open [`src/config/stages.ts`](src/config/stages.ts) and add a new `StageConfig` object to
the `STAGES` array (copy `GREEN_HILLS` as a starting point). Terrain parameters (amplitude,
frequency, roughness, max slope) are consumed by the seeded, deterministic
`TerrainHeightField`, so the same stage `seed` always generates the same terrain.

## Persistence

All progress (best distance, coins, unlocks, upgrades, settings) is stored in `localStorage`
via `SaveManager`, using a versioned JSON schema (`SAVE_VERSION`) with a migration function so
future schema changes can upgrade old saves in place instead of wiping progress.

## Status

Phase 1 (core MVP loop: drivable vehicle physics, procedural terrain, fuel/coins, crash
detection, HUD, results screen) is complete and verified end-to-end. See
[`PLAN.md`](PLAN.md) for the full phase roadmap.
