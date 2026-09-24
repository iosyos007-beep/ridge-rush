# Ridge Rush — Project Plan

A 2D physics hill-climb driving game. Two-input controls (gas/brake), procedurally
generated terrain, vehicle upgrades, stages, tricks, daily challenges and achievements.
All names/characters/vehicles/art are original.

Tech: TypeScript + Vite + Phaser 3 (Matter.js physics plugin) + simplex-noise for terrain,
Vitest for unit tests, ESLint + Prettier for code quality. No backend — all persistence via
`SaveManager` using localStorage with a versioned, migratable JSON schema.

## Phase 0 — Scaffolding (this commit)
- [x] Vite + TypeScript project scaffolded, default template cleared.
- [x] Dependencies: phaser (3.x), simplex-noise, vitest, eslint, prettier.
- [x] Strict `tsconfig.json`, flat `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`.
- [x] Folder structure created: `src/config`, `src/scenes`, `src/systems`, `src/entities`, `src/ui`.
- [x] `PLAN.md` (this file).

## Phase 1 — Core gameplay (MVP)
Goal: a single stage, single vehicle, drivable end-to-end, playable via `npm run dev`.
- [x] `BootScene` → `MenuScene` → `GameScene` → `HUDScene` → `ResultsScene` scene flow.
- [x] `TerrainGenerator`: chunked, seeded, simplex-noise based ground generation with
      smoothing, spawn-ahead/despawn-behind camera-relative chunks, filled ground polygon +
      surface stripe + parallax background layers.
- [x] `VehicleFactory` + `entities/Vehicle`: Matter.js chassis + 2 wheel bodies on spring
      constraints (suspension), wheel motor via angular velocity + torque limit, air-control
      torque application, data-driven per-vehicle config (mass, engine torque, max wheel
      speed, suspension stiffness/damping, tire friction, air-control torque, center of mass,
      drive type).
- [x] `entities/Driver`: ragdoll-lite head+torso attached to chassis; `CrashDetector` watches
      for head/terrain collision → 1.5s slow-motion → "Knocked out!" → run ends.
- [x] Input: keyboard (Right/D gas, Left/A brake) + touch pedal buttons (bottom-left/right),
      unified into one `InputState` consumed by the vehicle controller.
- [x] `FuelSystem`: drains on gas + idle drain, fuel pickups spawn at increasing intervals,
      empty tank → coast → stopped 3s → "Out of fuel!" ends run.
- [x] `CoinSystem`: coins (5/25/100/500) placed in arcs/lines, higher values farther out.
- [x] `CameraController`: smooth follow, speed-based look-ahead and zoom-out.
- [x] `HUDScene`: distance + best marker, fuel gauge (flash when low), coin counter, RPM/boost
      gauge, pause button.
- [x] `ResultsScene`: distance, coins, trick bonus, new-record banner, Retry/Garage/Stages.
- [x] `SaveManager` v1 schema (best distance, coins) with save/load + migration scaffold.
- [x] Verify `npm run dev` runs, drive a full run start-to-crash/out-of-fuel.

## Phase 2 — Tricks & scoring
- [x] `TrickDetector`: front flip / back flip (360° rotation counting while airborne), air
      time bonus (per 0.5s), "neck flip" (landing after a flip), wheelie detection.
- [x] Floating text popups ("Back Flip! +500") + bonus coins; landing on head cancels bonus.

## Phase 3 — Progression & economy
- [x] `GarageScene`: vehicle list (lock state, price, stat bars), idle preview on flat ground.
- [x] `config/upgrades.ts`: Engine / Suspension / Tires / 4WD-Traction + one vehicle-specific
      upgrade, 10 levels each, exponential cost curve, physics param modifiers.
- [x] `config/vehicles.ts`: 8 original vehicles (Starter Jeep, Dirt Bike, Pickup Truck, Rally
      Car, Monster Truck, Tractor, Hover-ish Buggy, Crab Crawler).
- [x] `config/stages.ts`: 6 original stages (Green Hills, Desert Dunes, Frozen Peaks, Night
      Forest, Scrapyard, Lunar Base) with unique terrain params/colors/friction/hazards,
      bought with coins.
- [x] `StageSelectScene`, checkpoints/milestones (coin bonus + partial refuel every N meters).
- [x] Personal-best distance per stage per vehicle. Economy balance in one config file.

## Phase 4 — Retention features
- [ ] `config/dailyChallenges.ts` + `ChallengeManager`: 3 daily challenges from a date seed.
- [ ] `config/achievements.ts` + `AchievementManager`: ~25 achievements, toast notifications,
      achievements screen.
- [ ] Cosmetics: paint colors/skins per vehicle, bought with coins.
- [ ] Optional breakable cosmetic parts (spoiler/bumper) on hard impacts.

## Phase 5 — Polish
- [ ] `AudioManager`: engine pitch follows wheel RPM, SFX (coin/fuel/crash/UI), per-stage
      music, mute toggles.
- [ ] Particles: wheel dust/snow, exhaust smoke, landing sparks.
- [ ] Screen shake on big landings, slow-motion on crash (already partly in Phase 1).
- [ ] `SettingsScene`: volume sliders, pedal-swap, graphics quality, reset progress (confirm).
- [ ] Pause menu, auto-pause on tab blur (`visibilitychange`).
- [ ] PWA manifest + service worker for offline installs.

## Testing & quality (ongoing, formalized per phase)
- [ ] Vitest: `SaveManager` (load/save/migration), upgrade cost formulas, trick detection
      (rotation counting), daily challenge generation (deterministic per date), terrain
      generator determinism (same seed → same terrain).
- [ ] Debug overlay (F1 toggle): FPS, physics body outlines, speed, fuel, seed, "+10,000
      coins" cheat.
- [ ] README: run/build instructions + how to add a vehicle or stage via config only.

## Process
- Commit after each phase with a summary of what changed and what's next.
- Run lint + tests after each phase; fix errors before moving on.
- Tune physics via config constants; any tuning decisions are explained in commit messages
  or README notes on "feel".
- No new dependencies beyond phaser, vite, typescript, simplex-noise, vitest, eslint,
  prettier without checking first.
