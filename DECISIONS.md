# GeoChain Architecture & Design Decision History

This document chronicles all major design decisions, physics pivots, player feedback, and balance iterations made during the development of **GeoChain**.

---

## 1. Aesthetic Pivot: Circular Balls $\to$ Hollow Geometry Wars Platonics
* **Initial State:** Standard semi-opaque filled circular balls with generic radial explosions.
* **Player Feedback:** Visuals felt muddy, shapes lacked identity, and sound was abrasive.
* **Decision:**
  * Adopted high-contrast **hollow vector wireframes** inspired by *Geometry Wars*.
  * Introduced 7 distinct Platonic/polygonal shapes (Spark Triangles, Amber Diamonds, Nova Stars, Hex Singularities, Ember Pentagons, Delta Chevrons, Catalyst Octagons).
  * Explosions conform to the exploding body's geometric shape (e.g. triangle explosions expand as equilateral triangles).

---

## 2. The Percolation Threshold & The Orbital Trapping Failure (V3)
* **Problem:** In early wide viewports ($1920 \times 1080$), small particle counts ($N = 8$) resulted in near-zero collision probability.
* **Flawed V3 Attempt:** Added harmonic focal node gravitational attraction to pull bodies into clusters.
* **Failure:** Caused particles to enter permanent local elliptical orbits. Particles lingered in small pockets and never crossed the arena, rendering 3-star clears mathematically impossible.
* **Final Resolution:**
  * Completely removed harmonic focal nodes.
  * Confined gameplay to a **centered 16:10 Geometry Wars vector arena**.
  * Restored **pure constant-velocity linear reflection physics** with zero friction or deceleration.

---

## 3. The "Earned Sparks" Dynamic Combo Model
* **Problem:** In traditional *Boomshine*, players click once and passively watch. If a chain dies on the far side of the screen, the player feels helpless.
* **Decision:**
  * Implemented an active combo reward system: reaching **x4, x8, x14, x22, x32...** combos awards **$+1$ Spark Charge**.
  * Players can strategically drop their earned spark mid-cascade or after a chain dies to bridge distant corners and ignite isolated clusters.

---

## 4. Inverted Velocity Difficulty Scaling
* **Insight:** In Chain Reaction games, **faster bodies make levels easier** because high-speed particles repeatedly sweep across active blast zones ($2.8\text{s}$ duration), dramatically multiplying encounter rates.
* **Calibration:**
  * **Level 1 (8 bodies):** Calibrated with **High Velocity (`4.6`)** $\to$ bodies cross the arena in $\approx 1.2\text{s}$, making Level 1 accessible and effortless to 3-star.
  * **Level 12 (75 bodies):** Calibrated with **Glacial Precision (`1.1`)** $\to$ slow movement requires calculated initial placement, Hexagon vortex compression, and tactical combo bridging.

---

## 5. 120 FPS Performance Architecture
* **Problem:** Explosions and hundreds of sparkles caused severe frame drops on Retina/4K displays.
* **Root Cause Analysis:**
  * Canvas `shadowBlur` was executing 400+ expensive Gaussian software blur passes per frame.
  * `SparkleParticle` objects were being allocated dynamically, thrashing the JS Garbage Collector.
* **Resolution:**
  * Replaced `shadowBlur` with layered dual-stroke vector passes ($50\times$ faster).
  * Implemented pre-allocated 450-instance `SparklePool` with $O(1)$ zero-GC recycling.
  * Used `Float32Array` ring buffers for particle motion trails.

---

## 6. Elastic Spacetime Warp Grid
* **Addition:** Added a 2D spring-mass lattice background that dynamically deforms under kinetic blast waves and gravitational singularities.
* **Adjustment:** Increased the blast influence radius by **+50%** ($2.4\times$ explosion radius) to produce rolling spacetime wave ripples across the playfield.
