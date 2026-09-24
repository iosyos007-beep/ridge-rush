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
  config/              Data-driven config: vehicles, stages, upgrades, balance constants,
                       achievements, dailyChallenges, cosmetics
  scenes/              BootScene, MenuScene, GarageScene, StageSelectScene, GameScene,
                       HUDScene, ResultsScene, AchievementsScene, DailyChallengesScene
  systems/             TerrainGenerator, VehicleFactory, FuelSystem, CoinSystem,
                       ObstacleSystem, CameraController, CrashDetector, SaveManager,
                       EconomyService, ParallaxBackground, TerrainHeightField (pure,
                       testable terrain math), AchievementManager, ChallengeManager
  entities/            Vehicle (chassis + wheels + ragdoll driver, 8 body styles, optional
                       breakable cosmetic part), Pickup
  ui/                  AchievementToast (stacked, auto-fading unlock notifications)
test/                  Vitest unit tests (SaveManager, upgrades, TerrainHeightField,
                       achievements, dailyChallenges, ChallengeManager)
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
- `bodyStyle` — which `drawBodyTopper()` case in `entities/Vehicle.ts` draws its silhouette
  (`"jeep" | "bike" | "truck" | "rally" | "monster" | "tractor" | "buggy" | "crab"`).
- `specialUpgrade` — the vehicle's 5th, unique upgrade slot (see below); every vehicle also
  gets the 4 shared `CORE_UPGRADES` automatically.

## Adding a new upgrade or tuning the economy

`src/config/upgrades.ts` defines the 4 shared upgrades (Engine, Suspension, Tires, 4WD
Traction) in `CORE_UPGRADES`, plus each vehicle's unique 5th slot via its own
`specialUpgrade` field in `config/vehicles.ts`. An upgrade's `effects` map lists which base
stats it bumps and by how much per level (fractional, non-compounding — multiple upgrades
affecting the same stat add together against the vehicle's *base* value). All upgrades share
`UPGRADE_MAX_LEVEL` (10) and the same exponential cost curve (`getUpgradeCost`); tweak
`UPGRADE_BASE_COST`/`UPGRADE_COST_GROWTH` to rebalance the whole economy in one place.
Vehicle/stage unlock prices live directly on each `VehicleConfig`/`StageConfig` as `price`.

## Adding a new stage (config only)

Open [`src/config/stages.ts`](src/config/stages.ts) and add a new `StageConfig` object to
the `STAGES` array (copy `GREEN_HILLS` as a starting point). Terrain parameters (amplitude,
frequency, roughness, max slope) are consumed by the seeded, deterministic
`TerrainHeightField`, so the same stage `seed` always generates the same terrain. Set
`hasHeadlights: true` for a dark stage (draws a headlight cone in `GameScene`), or `hazards`
for Scrapyard-style pushable obstacle crates (`ObstacleSystem`).

## Persistence

All progress (best distance per stage+vehicle, coins, vehicle/stage unlocks, upgrade levels,
selected vehicle, settings, lifetime stats, unlocked achievements, unlocked/selected skins,
and today's daily challenge state) is stored in `localStorage` via `SaveManager`, using a
versioned JSON schema (`CURRENT_SAVE_VERSION`) with a migration function so future schema
changes can upgrade old saves in place instead of wiping progress. Each scene that
reads/writes save data constructs its own `SaveManager` **inside `create()`** (not as a class
field) so it always reflects the latest state — Phaser instantiates scene classes once at
boot and reuses them across `scene.start()` calls, so a field-initialized `SaveManager` would
read a stale boot-time snapshot forever and silently clobber other scenes' writes.

## Adding a new achievement (config only)

Open [`src/config/achievements.ts`](src/config/achievements.ts) and add a new entry to the
`ACHIEVEMENTS` array with a unique `id`, `name`, `description`, `coinReward`, and a `check`
function that reads the read-only `AchievementContext` (lifetime stats, unlocked vehicles/
stages/skins, upgrade levels) and returns `true` once earned. `AchievementManager.
checkAchievements()` runs this over every not-yet-unlocked achievement after each run,
upgrade purchase, and unlock, pays out `coinReward` exactly once, and returns the newly
unlocked list for toast notifications — no other code needs to change.

## Adding a new daily challenge template (config only)

Open [`src/config/dailyChallenges.ts`](src/config/dailyChallenges.ts) and add a new
`ChallengeTemplate` to `CHALLENGE_TEMPLATES`: a `metric` (`distanceInStage`,
`distanceWithVehicle`, `flipsInRun`, `wheeliesInRun`, or `coinsToday`), an `aggregate` rule
(`"max"` for "best single run" style goals, `"sum"` for "cumulative today" goals), and a
target/reward range. `generateDailyChallenges(dateKey)` deterministically shuffles and picks
3 templates per local calendar day (seeded from the date string itself, so every player sees
the same challenges on the same day and they regenerate automatically at local midnight).

## Cosmetics (paint jobs)

[`src/config/cosmetics.ts`](src/config/cosmetics.ts) defines a shared `SKINS` palette (a
"Factory Paint" default plus 5 purchasable finishes) that any vehicle can select
independently from the Garage's PAINT row. Skins are bought once and then reusable across
every vehicle. To add a new finish, add an entry to `SKINS` with an `id`, `name`, `price`,
and `color`/`accentColor` overrides — `getEffectiveVehicleConfig()` in
[`src/config/upgrades.ts`](src/config/upgrades.ts) already applies the selected skin
wherever a vehicle's effective config is resolved (gameplay, Garage preview), so no other
wiring is required.

## Status

Phase 1 (core MVP loop: drivable vehicle physics, procedural terrain, fuel/coins, crash
detection, HUD, results screen), Phase 2 (tricks & scoring: flip/back-flip rotation
counting, air-time bonus, wheelie detection, floating popups, bonus coins on the results
screen), Phase 3 (progression & economy: `GarageScene` with 8 vehicles, upgrades and an
idling preview; `StageSelectScene` with 6 stages; per-vehicle upgrades; checkpoints; personal
bests per stage+vehicle), and Phase 4 (retention: 26 achievements with toast notifications
and an `AchievementsScene`; 3 daily challenges per local day with progress bars in
`DailyChallengesScene`; a 6-finish paint/skin picker in the Garage; breakable cosmetic parts
that detach on hard landings for 3 vehicles) are complete and verified end-to-end. See
[`PLAN.md`](PLAN.md) for the full phase roadmap.

Two deliberate scope interpretations from Phase 3: each vehicle's "special" upgrade slot
(the spec's "Fuel Tank, Boost, Downforce" suggestion) reuses one of the existing tunable
physics stats rather than inventing new mechanics, and the six-legged "Crab Crawler" runs on
the same 2-wheel physics rig as every other vehicle — its extra legs are decorative line art
drawn on top, since the physics/suspension system only supports exactly 2 wheel bodies.

Three deliberate scope interpretations from Phase 4: daily challenges roll over at **local**
midnight (`getTodayDateKey()` uses the device's own calendar day), not UTC, so a player's
"today" always matches their own clock; paint jobs are a **shared cross-vehicle palette**
(buy a finish once, apply it to any vehicle) rather than unique-per-vehicle skins, since the
spec only asked for "paint colors/skins per vehicle" without requiring vehicle-exclusive
options; and breakable parts are enabled on 3 vehicles whose flavor text already implies
fragility or heavy impacts (Hauler, Apex Sprinter, Colossus) rather than all 8, since the
spec described it as an "optional flag per vehicle."
