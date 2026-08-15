# GeoChain Technical Architecture

This document describes the engine design, mathematical foundations, performance optimization pipeline, and audio synthesis architecture of **GeoChain**.

---

## 1. Directory & Module Structure

```
geochain/
├── index.html          # Semantic HTML5 layout, HUD bar, and modal cards
├── style.css           # Pure CSS design system, typography tokens, glassmorphism HUD
├── package.json        # NPM metadata and launch scripts
├── server.js           # Zero-dependency Node.js ESM static HTTP server with port fallback
└── src/
    ├── audio.js        # Web Audio API pure sine pentatonic synthesizer & delay lines
    ├── explosion.js    # Shape-conforming blast waves, SparklePool, analytical collisions
    ├── game.js         # Core loop, state machine, scoring, leaderboards & 120 FPS batching
    ├── grid.js         # 2D Hooke's law spring-mass lattice with radial blast distortion
    ├── levels.js       # 12 campaign levels, star thresholds, and inverted velocity curve
    ├── main.js         # Canvas DPI scaling, HUD data bindings, modal controllers
    └── particles.js    # 7 wireframe platonic shapes, ring-buffer trails, bounce physics
```

---

## 2. Mathematical Foundations

### 2.1 Exact $O(1)$ Analytical Polygon Collision Detection
Unlike standard circle approximations, explosions in GeoChain conform to regular $N$-gons (Triangles, Diamonds, Pentagons, Hexagons, Octagons).

For a regular $N$-gon centered at $(C_x, C_y)$ with radius $R$, rotation $\theta_{\text{rot}}$, and target particle at $(P_x, P_y)$ with radius $r_{\text{part}}$:

1. **Bounding Circumradius Culling:**
   $$\text{dist}^2 = (P_x - C_x)^2 + (P_y - C_y)^2$$
   $$\text{If } \text{dist}^2 > (R + r_{\text{part}})^2 \implies \text{No Collision}$$

2. **Inscribed Inradius Quick-Accept:**
   $$R_{\text{in}} = R \cos\left(\frac{\pi}{N}\right)$$
   $$\text{If } \text{dist} \le R_{\text{in}} + r_{\text{part}} \implies \text{Collision Confirmed}$$

3. **Canonical Sector Projection:**
   Calculate polar angle relative to polygon rotation:
   $$\theta = \text{atan2}(P_y - C_y, P_x - C_x) - \theta_{\text{rot}} \pmod{2\pi}$$
   Map to the canonical half-sector angle $\theta_{\text{rel}} \in [-\frac{\pi}{N}, \frac{\pi}{N}]$:
   $$\theta_{\text{rel}} = \left(\theta \pmod{\frac{2\pi}{N}}\right) - \frac{\pi}{N}$$
   Project radial distance to edge plane:
   $$d_{\text{projected}} = \text{dist} \times \cos(\theta_{\text{rel}})$$
   $$\text{Collision} \iff d_{\text{projected}} \le R_{\text{in}} + r_{\text{part}}$$

---

### 2.2 Elastic Spacetime Grid (Hooke's Law Spring Lattice)
The arena background consists of an $M \times N$ array of nodes.
For each unpinned node $i$:

1. **Restoring Anchor Spring Force:**
   $$F_{\text{anchor}} = -k_{\text{spring}} (x_i - \text{baseX}_i) - c_{\text{damp}} \cdot v_i$$
2. **Neighbor Coupling (Surface Tension):**
   $$F_{\text{neighbor}} = k_{\text{neighbor}} \sum_{j \in \text{neighbors}} (x_j - x_i)$$
3. **Explosion Shockwave Impulse:**
   For an explosion at $(x_e, y_e)$ with blast radius $R_e$:
   $$\text{influenceRadius} = \max(2.4 \times R_e, 115)$$
   $$\text{factor} = 1 - \frac{\text{dist}}{\text{influenceRadius}}$$
   $$\text{smoothFalloff} = \text{factor}^2 (3 - 2 \cdot \text{factor})$$
   $$\text{impulse} = \pm \frac{\text{force} \cdot \text{smoothFalloff}}{\text{dist} + 24}$$

---

### 2.3 Dynamic Combo & Scoring Formula
Points for destroying a geometry:
$$\text{Multiplier} = 1 + \left\lfloor \log_2(\max(1, \text{Combo})) \right\rfloor \times 0.5 + \text{Combo} \times 0.25$$
$$\text{Points} = \text{round}(\text{BasePoints} \times \text{Multiplier})$$

**Speed Bonus Multiplier:**
If round clear time $t < \text{parTime}$:
$$\text{SpeedBonus} = 1.0 + \min\left(1.5, \frac{\text{parTime} - t}{\text{parTime}} \times 1.5\right)$$

**Spare Spark Bonus:**
$$\text{Bonus} = \text{ChargesLeft} \times 2,500\text{ pts}$$

---

## 3. High-Performance 120 FPS Architecture

To maintain 120 FPS during massive 50+ body cascades on high-DPI displays:

1. **Elimination of Canvas `shadowBlur`:**
   * Replaced expensive Gaussian software blur passes with **multi-pass vector stroke layering** (Thick semi-transparent outer stroke + crisp inner stroke + white core).
2. **Pre-allocated Zero-GC `SparklePool`:**
   * 450 pre-allocated `SparkleParticle` instances recycled in $O(1)$ without runtime object allocations.
3. **Batched Render Passes:**
   * Sparkles and grid lines are drawn in single `ctx.beginPath()` passes with GPU additive blending (`globalCompositeOperation = 'lighter'`).
4. **Ring-Buffer Trails:**
   * Replaced `Array.push()`/`shift()` with fixed `Float32Array` circular buffers (`trailX`, `trailY`, `trailRot`).
5. **DPI Throttling:**
   * Canvas resolution is clamped to $\min(\text{devicePixelRatio}, 2)$ to eliminate $9\times$ fill-rate overhead on 4K/Retina displays.

---

## 4. Web Audio Pentatonic Synthesizer

The sound engine synthesizes pure acoustic sine chords in the **F Major / D Minor Pentatonic Scale** ($F, G, A, C, D$ across octaves $3 \to 7$):

* **Pure Harmonics:** Dual sine oscillators with soft exponential gain decay ($0.85\text{s}$).
* **Stereo Delay Feedback:** $220\text{ms}$ delay line with $28\%$ feedback gain.
* **Warm Acoustic Filter:** $2,200\text{Hz}$ lowpass biquad filter.
* **Dynamic Voicing:** Combo cascades traverse ascending arpeggios, creating harmonious, musical chimes.
