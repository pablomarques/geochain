# GeoChain Architecture & Game Design Decision Log

This document records the architectural, physical, and design decisions made throughout GeoChain's development, their rationale, and outcomes.

---

## Decision Record 001: 120 FPS Zero-GC Particle & Collision Architecture
* **Date:** 2026-08-14
* **Context:** High particle counts ($50+$ bodies) with rapid polygon collision checks and particle trails could trigger JavaScript GC pauses or frame drops on high refresh-rate monitors.
* **Decision:**
  1. Replaced dynamic object allocation with zero-GC `SparklePool` (450 pre-allocated objects).
  2. Implemented `Float32Array` circular ring buffers for particle motion trails.
  3. Replaced Canvas `ctx.shadowBlur` with multi-pass vector strokes (thick translucent outer stroke + sharp inner white core stroke).
  4. Formulated exact analytical $O(1)$ polygon collision math using circumradius bounding pre-checks followed by radial cosine sector projection:
     $$d_{\text{proj}} = d \cdot \cos\left(\left(((\theta - \phi) \bmod \frac{2\pi}{N}) + 2\pi\right) \bmod \frac{2\pi}{N} - \frac{\pi}{N}\right) \le r_{\text{in}} + r_{\text{particle}}$$
* **Outcome:** Rock-solid 120 FPS rendering across all desktop and mobile displays with zero GC pauses.

---

## Decision Record 002: Inverted Velocity Difficulty Curve
* **Date:** 2026-08-14
* **Context:** In chain reaction games, faster bodies increase encounter rate and mean free path collisions, making early levels easier to clear when bodies are fast, while slower bodies in late levels demand calculated timing and precision.
* **Decision:** Inverted the velocity progression:
  * Level 1: `baseSpeed = 4.6` (High Velocity / Rapid Encounters / Easy 3-Star clears).
  * Level 12: `baseSpeed = 1.1` (Glacial Precision / High tactical demand).
* **Outcome:** Early levels feel dynamic and welcoming; late levels feel like tense geometric chess.

---

## Decision Record 003: Elastic Spacetime Grid Distortion
* **Date:** 2026-08-14
* **Context:** Needed a sense of physical depth and spacetime fabric akin to *Geometry Wars*.
* **Decision:** Built a 2D spring-mass lattice with Hooke's Law restoring forces and neighbor damping (`src/grid.js`). Explosions apply kinetic push waves, and Hex Singularities apply gravitational inward pull. Blast radius influence expanded to $+50\%$ ($2.4\times$ radius).
* **Outcome:** Visually hypnotic ripple effects that give tactile weight to every detonation.

---

## Decision Record 004: Persistent Cloud Hall of Fame
* **Date:** 2026-08-14
* **Context:** High scores needed to be shared globally across devices, players, and sessions without requiring account friction.
* **Decision:** Created a Supabase PostgreSQL backend (`public.leaderboard_scores`) with Row-Level Security (RLS) public policies. Integrated zero-dependency REST queries in `src/leaderboard.js` with instant local caching for offline resilience.
* **Outcome:** Real-time worldwide leaderboards for both Global Hall of Fame and per-level rankings.

---

## Decision Record 005: Resolution-Independent Proportional Scaling
* **Date:** 2026-08-14
* **Context:** When the browser window was resized smaller, fixed pixel radii ($65\text{px}$) and speeds caused the explosion to cover $>40\%$ of the screen, creating an exploit where shrinking the window allowed 1-click full wipes.
* **Decision:**
  1. Defined a virtual reference arena: $\text{REFERENCE\_ARENA} = (960 \times 600)$.
  2. Derived dynamic scale factor: $S = \frac{\text{arena.width}}{960}$.
  3. Scaled all physical parameters proportionally by $S$:
     * Blast Radii: $R_{\text{actual}} = R_{\text{virtual}} \times S$
     * Particle Radii: $r_{\text{actual}} = r_{\text{virtual}} \times S$
     * Particle Velocities: $v_{\text{actual}} = v_{\text{virtual}} \times S$
     * Grid Spacing & Impulses: $\text{spacing}_{\text{actual}} = 30 \times S$
  4. On window resize, entities preserve normalized relative coordinates $(x_{\text{rel}}, y_{\text{rel}})$ and scale velocities without teleportation or speed warping.
* **Outcome:** Wall-to-wall traversal time $T = \frac{W}{v}$ and geometric collision density remain **strictly invariant** across any screen size or browser resize. No player gains an advantage by resizing their window.
