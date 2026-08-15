# GeoChain (Geometry Wars × Chain Reaction)

A hypnotic, vector-wireframe geometric cascade game with pure constant-velocity bounce physics, an elastic 2D spacetime warp grid, organic pentatonic Web Audio synthesis, and dynamic combo scoring.

🌐 **Live Demo:** [https://geochain-pabs-studio.vercel.app](https://geochain-pabs-studio.vercel.app)  
📦 **Repository:** [https://github.com/pablomarques/geochain](https://github.com/pablomarques/geochain)

---

## 🎮 Core Mechanics

1. **Trigger Spark & Cascades:**
   * Click inside the 16:10 centered vector arena to place an initial ignition spark.
   * Floating geometric wireframe bodies that contact the expanding blast detonate, spawning shape-conforming shockwaves.
2. **Earned Sparks Combo Engine:**
   * Hitting combo milestones (**x4, x8, x14, x22, x32...**) awards **+1 Spark Charge**.
   * Players can drop earned sparks anywhere on the board mid-chain to actively bridge distant clusters and keep the mega-reaction alive.
3. **Inverted Velocity Difficulty Curve:**
   * **Early Levels (1–3):** High velocity ($\approx 4.6\text{s}^{-1}$) $\to$ bodies cross the arena in $\approx 1.2\text{s}$, creating frequent encounters and effortless 3-star onboarding.
   * **Late Levels (10–12):** Glacial drift ($\approx 1.1\text{s}^{-1}$) $\to$ requires precision timing, gravitational singularities, and tactical combo spark drops.
4. **Elastic Spacetime Warp Grid:**
   * A 2D Hooke's Law spring-mass lattice background that physically bends and ripples outward from explosions, and funnels inward toward Hex singularities.
5. **Serene Pentatonic Audio Engine:**
   * Pure sine harmonic acoustics tuned to the F Major / D Minor pentatonic scale with a stereo delay feedback network and warm lowpass filter.
6. **Hall of Fame Leaderboards:**
   * Per-level Top 10 high scores with arcade initials tagging, post-round comparison scorecards, and global rankings.

---

## 📐 Geometric Wireframe Platonic Bodies

| Shape | Platonic Body | Color | Special Attribute |
| :--- | :--- | :--- | :--- |
| **Triangle** | Spark Triangle | Neon Sky Cyan (`#38bdf8`) | Balanced speed, triangular blast wave |
| **Diamond** | Heavy Diamond | Neon Amber (`#fb923c`) | Concentric diamond blast field ($1.65\times$ area) |
| **4-Star** | Nova Star | Neon Fuchsia (`#e879f9`) | Fires 4 high-speed diamond shrapnel shards |
| **Hexagon** | Hex Singularity | Neon Emerald (`#34d399`) | Gravitational vortex pulling bodies inward |
| **Pentagon** | Ember Pentagon | Neon Gold (`#facc15`) | Lingers $2.8\times$ longer as an anchor bridge |
| **Chevron** | Hyper Chevron | Electric Blue (`#60a5fa`) | High-speed delta dart bridging opposite walls |
| **Octagon** | Catalyst Octagon | Radiant White (`#ffffff`) | Grants $+1$ trigger charge & $+2,500\text{ pts}$ |

---

## 🚀 Running Locally

```bash
# Clone repository
git clone git@github.com:pablomarques/geochain.git
cd geochain

# Run static server (zero dependencies required)
npm start
# Server listens on http://localhost:5173/ (or 5174 if occupied)
```

---

## 📚 Documentation Suite

* [ARCHITECTURE.md](./ARCHITECTURE.md) — 120 FPS optimization rules, analytical collision geometry, Web Audio synth, and spring lattice equations.
* [DECISIONS.md](./DECISIONS.md) — Chronological history of design decisions, player feedback, and balance iterations.
* [LEVEL_DESIGN_SPEC.md](./LEVEL_DESIGN_SPEC.md) — Campaign level configuration schema and viewport parity rules.
