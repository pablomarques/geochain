# GeoChain Level Design & Format Specification

This document details the campaign level configuration schema, star threshold balance rules, and desktop vs. mobile viewport parity guidelines.

---

## 1. Campaign Level Schema (JSON Specification)

```typescript
interface CampaignLevel {
  level: number;              // 1-indexed stage number (e.g. 1 to 12)
  title: string;              // Descriptive level title (e.g. 'Diamond Core')
  target: number;             // Minimum quota required to pass the level (1 Star)
  stars: [number, number, number]; // [1 Star, 2 Stars, 3 Stars] quotas (e.g. [6, 11, 16])
  totalParticles: number;     // Total bodies spawned in the arena (e.g. 20)
  baseSpeed: number;          // Particle linear speed factor (e.g. 4.6 down to 1.1)
  speedLabel: string;         // Player-facing tempo badge (e.g. 'High Velocity', 'Swift', 'Glacial')
  parTime: number;            // Time threshold in seconds for maximum Speed Clear bonus
  charges: number;            // Initial starting spark charges (1 for Levels 1-9; 2 for Levels 10-12)
  distribution: {             // Breakdown of platonic shapes spawned
    standard?: number;        // Spark Triangle (Sides: 3, Speed: 1.0x, Radius: 9px)
    mega?: number;            // Heavy Diamond (Sides: 4, Speed: 0.75x, Blast Area: 1.65x)
    splitter?: number;        // Nova Star (4-Star, Speed: 1.1x, Fires 4 Shrapnel Darts)
    vortex?: number;          // Hex Singularity (Sides: 6, Speed: 0.9x, Gravitational Pull)
    longburner?: number;      // Ember Pentagon (Sides: 5, Blast Duration: 2.8x)
    speedster?: number;       // Delta Chevron (Sides: 3 Dart, Speed: 1.85x)
    catalyst?: number;        // Catalyst Octagon (Sides: 8, Grants +1 Spark Charge)
  };
  tip: string;                // Contextual level hint shown on HUD banner
}
```

---

## 2. Star Threshold Calibration Rules

1. **1 Star ($\bigstar$ Pass):**
   * Early levels: $12\%\text{–}30\%$ of total bodies.
   * Late levels: $60\%\text{–}70\%$ of total bodies.
2. **2 Stars ($\bigstar\bigstar$ Mastery):**
   * Early levels: $40\%\text{–}55\%$ of total bodies.
   * Late levels: $75\%\text{–}85\%$ of total bodies.
3. **3 Stars ($\bigstar\bigstar\bigstar$ Perfect Run):**
   * Early levels: $65\%\text{–}75\%$ of total bodies (clearable with 1 initial spark + 1 earned combo spark).
   * Late levels: $90\%\text{–}95\%$ of total bodies (requires chaining multiple earned sparks and catalyst drops).

---

## 3. Desktop vs. Mobile Viewport Parity Rules

To ensure a level designed for Desktop plays with identical feel and difficulty on Mobile:

| Metric | Desktop (16:10 / 16:9) | Mobile (9:16 Portrait) | Conversion Rule |
| :--- | :--- | :--- | :--- |
| **Arena Aspect Ratio** | $1.6 : 1$ (e.g. $960 \times 600\text{px}$) | $0.625 : 1$ (e.g. $400 \times 640\text{px}$) | Keep arena area $A \approx \text{constant}$ |
| **Particle Density** | $\rho = \frac{N}{A}$ | $\rho = \frac{N}{A}$ | Same particle count $N$ produces identical mean free path |
| **Blast Radius** | $65\text{px}$ standard | $52\text{px}\text{–}58\text{px}$ (scaled to $\sqrt{\text{width}/\text{height}}$) | Blast area covers identical $\%$ of arena surface |
| **Particle Speed** | `baseSpeed` | `baseSpeed * (mobileDiagonal / desktopDiagonal)` | Traversal time across screen remains identical |
