/**
 * GeoChain Campaign & Level Architecture
 * Campaigns represent curated sequences of geometric cascade levels.
 * Supports dual-format specifications: Desktop (16:10 / 16:9) vs. Mobile (9:16 portrait).
 */

const ALL_ENTITY_TYPES = ['standard', 'mega', 'splitter', 'vortex', 'longburner', 'speedster', 'catalyst'];

export function resolveLevelConfig(levelData, platform = 'desktop') {
  if (!levelData) return null;
  const p = platform.toLowerCase();

  const meta = {
    level: levelData.level || 1,
    title: levelData.title || `Stage ${levelData.level || 1}`,
    tip: levelData.tip || ''
  };

  let fmt = null;
  if (levelData.formats && levelData.formats[p]) {
    fmt = JSON.parse(JSON.stringify(levelData.formats[p]));
  } else if (p === 'mobile' && levelData.mobile) {
    fmt = JSON.parse(JSON.stringify(levelData.mobile));
  } else if (p === 'desktop' && levelData.desktop) {
    fmt = JSON.parse(JSON.stringify(levelData.desktop));
  } else {
    // Fallback to top-level properties
    fmt = {
      target: levelData.target || 1,
      stars: levelData.stars || [1, 3, 5],
      totalParticles: levelData.totalParticles || 8,
      baseSpeed: levelData.baseSpeed || 2.4,
      speedLabel: levelData.speedLabel || 'Normal',
      bodySizeScale: levelData.bodySizeScale || 1.0,
      sparkBlastScale: levelData.sparkBlastScale || 1.0,
      chainBlastScale: levelData.chainBlastScale || 1.0,
      sparkDurationScale: levelData.sparkDurationScale || 1.0,
      chainDurationScale: levelData.chainDurationScale || 1.0,
      parTime: levelData.parTime || 5.0,
      charges: levelData.charges || 1,
      distribution: levelData.distribution || { standard: 8 },
      bodies: levelData.bodies || null,
      walls: levelData.walls || []
    };

    // Auto-derive mobile defaults if flat level
    if (p === 'mobile') {
      fmt.totalParticles = Math.max(4, Math.round(fmt.totalParticles * 0.7));
      fmt.baseSpeed = +(Math.max(1.0, fmt.baseSpeed * 0.9)).toFixed(1);
      fmt.bodySizeScale = +(Math.min(2.5, fmt.bodySizeScale * 1.15)).toFixed(2);
      const newDist = {};
      let remaining = fmt.totalParticles;
      for (const [k, v] of Object.entries(fmt.distribution)) {
        const scaledCount = Math.min(remaining, Math.max(1, Math.round(v * 0.7)));
        newDist[k] = scaledCount;
        remaining -= scaledCount;
      }
      fmt.distribution = newDist;
      fmt.target = Math.max(1, Math.round(fmt.target * 0.7));
      fmt.stars = [fmt.target, Math.max(2, Math.round(fmt.stars[1] * 0.7)), Math.max(3, Math.round(fmt.stars[2] * 0.7))];
    }
  }

  // Canonicalize top-level blast & duration scales
  if (fmt.sparkBlastScale === undefined) fmt.sparkBlastScale = 1.0;
  if (fmt.chainBlastScale === undefined) fmt.chainBlastScale = 1.0;
  if (fmt.sparkDurationScale === undefined) fmt.sparkDurationScale = 1.0;
  if (fmt.chainDurationScale === undefined) fmt.chainDurationScale = 1.0;

  // Canonicalize per-body configuration { count, size, speed, blast, duration }
  const bodies = {};
  let totalCount = 0;
  const dist = {};

  ALL_ENTITY_TYPES.forEach(type => {
    if (fmt.bodies && fmt.bodies[type]) {
      const b = fmt.bodies[type];
      const count = typeof b === 'number' ? b : (b.count || 0);
      const size = typeof b === 'object' && b.size !== undefined ? b.size : 1.0;
      const speed = typeof b === 'object' && b.speed !== undefined ? b.speed : 1.0;
      const blast = typeof b === 'object' && b.blast !== undefined ? b.blast : 1.0;
      const duration = typeof b === 'object' && b.duration !== undefined ? b.duration : 1.0;
      bodies[type] = { count, size, speed, blast, duration };
    } else {
      const count = (fmt.distribution && fmt.distribution[type]) || 0;
      bodies[type] = { count, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
    }
    dist[type] = bodies[type].count;
    totalCount += bodies[type].count;
  });

  fmt.bodies = bodies;
  fmt.distribution = dist;
  if (totalCount > 0) {
    fmt.totalParticles = totalCount;
  }

  return { ...meta, ...fmt };
}

export const CAMPAIGNS = [
  {
    id: 'genesis',
    title: 'Genesis Odyssey',
    tagline: 'The Core Geometric Cascade',
    description: 'Master the fundamental harmonics of geometric chain reactions through 12 calibrated velocity stages.',
    badge: '🌌',
    color: '#38bdf8',
    author: 'GeoChain Studio',
    version: '1.2.0',
    levels: [
      {
        level: 1,
        title: 'First Sparks',
        tip: 'High velocity! Bodies cross the arena quickly and easily collide into your spark.',
        formats: {
          desktop: {
            target: 1,
            stars: [1, 3, 5],
            totalParticles: 8,
            baseSpeed: 4.6,
            speedLabel: 'High Velocity (Easy)',
            bodySizeScale: 1.0,
            parTime: 4.5,
            charges: 1,
            distribution: { standard: 8 },
            walls: []
          },
          mobile: {
            target: 1,
            stars: [1, 3, 5],
            totalParticles: 6,
            baseSpeed: 4.0,
            speedLabel: 'Swift',
            bodySizeScale: 1.15,
            parTime: 4.5,
            charges: 1,
            distribution: { standard: 6 },
            walls: []
          }
        }
      },
      {
        level: 2,
        title: 'Dual Swarms',
        tip: 'Fast swarms ensure high encounter rates across the arena.',
        formats: {
          desktop: {
            target: 3,
            stars: [3, 6, 10],
            totalParticles: 14,
            baseSpeed: 4.2,
            speedLabel: 'Swift',
            bodySizeScale: 1.0,
            parTime: 5.0,
            charges: 1,
            distribution: { standard: 14 },
            walls: []
          },
          mobile: {
            target: 2,
            stars: [2, 5, 8],
            totalParticles: 10,
            baseSpeed: 3.8,
            speedLabel: 'Brisk',
            bodySizeScale: 1.15,
            parTime: 5.0,
            charges: 1,
            distribution: { standard: 10 },
            walls: []
          }
        }
      },
      {
        level: 3,
        title: 'Diamond Core',
        tip: 'Amber Diamonds create huge square blast fields to catch swift geometries.',
        formats: {
          desktop: {
            target: 6,
            stars: [6, 11, 16],
            totalParticles: 20,
            baseSpeed: 3.8,
            speedLabel: 'Brisk',
            bodySizeScale: 1.0,
            parTime: 5.5,
            charges: 1,
            distribution: { standard: 15, mega: 5 },
            walls: []
          },
          mobile: {
            target: 4,
            stars: [4, 8, 12],
            totalParticles: 14,
            baseSpeed: 3.4,
            speedLabel: 'Rapid',
            bodySizeScale: 1.15,
            parTime: 5.5,
            charges: 1,
            distribution: { standard: 10, mega: 4 },
            walls: []
          }
        }
      },
      {
        level: 4,
        title: 'Nova Shards',
        tip: 'Fuchsia Stars fire 4 fast diamond shards to bridge distant clusters.',
        formats: {
          desktop: {
            target: 9,
            stars: [9, 15, 21],
            totalParticles: 26,
            baseSpeed: 3.4,
            speedLabel: 'Rapid',
            bodySizeScale: 1.0,
            parTime: 6.0,
            charges: 1,
            distribution: { standard: 17, mega: 3, splitter: 6 },
            walls: []
          },
          mobile: {
            target: 6,
            stars: [6, 11, 15],
            totalParticles: 18,
            baseSpeed: 3.0,
            speedLabel: 'Moderate',
            bodySizeScale: 1.15,
            parTime: 6.0,
            charges: 1,
            distribution: { standard: 12, mega: 2, splitter: 4 },
            walls: []
          }
        }
      },
      {
        level: 5,
        title: 'Pentagon Embers',
        tip: 'Speed is moderate. Gold Pentagons linger 2.8x longer to keep chains alive.',
        formats: {
          desktop: {
            target: 13,
            stars: [13, 20, 27],
            totalParticles: 32,
            baseSpeed: 3.0,
            speedLabel: 'Moderate',
            bodySizeScale: 1.0,
            parTime: 6.5,
            charges: 1,
            distribution: { standard: 19, mega: 4, splitter: 4, longburner: 5 },
            walls: []
          },
          mobile: {
            target: 9,
            stars: [9, 14, 19],
            totalParticles: 22,
            baseSpeed: 2.7,
            speedLabel: 'Cruising',
            bodySizeScale: 1.15,
            parTime: 6.5,
            charges: 1,
            distribution: { standard: 13, mega: 3, splitter: 3, longburner: 3 },
            walls: []
          }
        }
      },
      {
        level: 6,
        title: 'Hex Singularity',
        tip: 'As speeds slow, use Emerald Hexagons to pull bodies inward.',
        formats: {
          desktop: {
            target: 18,
            stars: [18, 26, 33],
            totalParticles: 38,
            baseSpeed: 2.6,
            speedLabel: 'Cruising',
            bodySizeScale: 1.0,
            parTime: 7.0,
            charges: 1,
            distribution: { standard: 20, mega: 4, splitter: 6, vortex: 8 },
            walls: []
          },
          mobile: {
            target: 12,
            stars: [12, 18, 23],
            totalParticles: 26,
            baseSpeed: 2.3,
            speedLabel: 'Steady',
            bodySizeScale: 1.15,
            parTime: 7.0,
            charges: 1,
            distribution: { standard: 14, mega: 3, splitter: 4, vortex: 5 },
            walls: []
          }
        }
      },
      {
        level: 7,
        title: 'Delta Velocity',
        tip: 'Electric Blue Chevrons retain high speed—use them to hit slower bodies.',
        formats: {
          desktop: {
            target: 22,
            stars: [22, 31, 39],
            totalParticles: 44,
            baseSpeed: 2.3,
            speedLabel: 'Steady',
            bodySizeScale: 1.0,
            parTime: 7.5,
            charges: 1,
            distribution: { standard: 22, speedster: 12, splitter: 5, longburner: 5 },
            walls: []
          },
          mobile: {
            target: 15,
            stars: [15, 22, 27],
            totalParticles: 30,
            baseSpeed: 2.1,
            speedLabel: 'Steady',
            bodySizeScale: 1.15,
            parTime: 7.5,
            charges: 1,
            distribution: { standard: 15, speedster: 8, splitter: 4, longburner: 3 },
            walls: []
          }
        }
      },
      {
        level: 8,
        title: 'Prism Overcharge',
        tip: 'Slower drift requires calculated spark timing. Catalyst Octagons grant +1 spark.',
        formats: {
          desktop: {
            target: 27,
            stars: [27, 37, 45],
            totalParticles: 50,
            baseSpeed: 2.0,
            speedLabel: 'Deliberate',
            bodySizeScale: 1.0,
            parTime: 8.0,
            charges: 1,
            distribution: { standard: 24, mega: 6, splitter: 7, vortex: 7, catalyst: 6 },
            walls: []
          },
          mobile: {
            target: 18,
            stars: [18, 25, 31],
            totalParticles: 35,
            baseSpeed: 1.8,
            speedLabel: 'Deliberate',
            bodySizeScale: 1.15,
            parTime: 8.0,
            charges: 1,
            distribution: { standard: 17, mega: 4, splitter: 5, vortex: 5, catalyst: 4 },
            walls: []
          }
        }
      },
      {
        level: 9,
        title: 'Vortex Resonance',
        tip: 'Slow movement. Chain multiple vortexes together to compress the field.',
        formats: {
          desktop: {
            target: 32,
            stars: [32, 42, 51],
            totalParticles: 56,
            baseSpeed: 1.7,
            speedLabel: 'Slow',
            bodySizeScale: 1.0,
            parTime: 8.5,
            charges: 1,
            distribution: { standard: 26, mega: 8, vortex: 12, splitter: 6, longburner: 4 },
            walls: []
          },
          mobile: {
            target: 22,
            stars: [22, 29, 35],
            totalParticles: 40,
            baseSpeed: 1.5,
            speedLabel: 'Calm Drift',
            bodySizeScale: 1.15,
            parTime: 8.5,
            charges: 1,
            distribution: { standard: 18, mega: 6, vortex: 8, splitter: 5, longburner: 3 },
            walls: []
          }
        }
      },
      {
        level: 10,
        title: 'Critical Geometry',
        tip: '2 starting Sparks! Stagger your triggers to cover distant slow swarms.',
        formats: {
          desktop: {
            target: 38,
            stars: [38, 49, 57],
            totalParticles: 62,
            baseSpeed: 1.5,
            speedLabel: 'Calm Drift',
            bodySizeScale: 1.0,
            parTime: 9.0,
            charges: 2,
            distribution: { standard: 26, mega: 10, splitter: 12, vortex: 8, speedster: 4, catalyst: 2 },
            walls: []
          },
          mobile: {
            target: 26,
            stars: [26, 34, 40],
            totalParticles: 44,
            baseSpeed: 1.4,
            speedLabel: 'Slow',
            bodySizeScale: 1.15,
            parTime: 9.0,
            charges: 2,
            distribution: { standard: 18, mega: 7, splitter: 8, vortex: 6, speedster: 3, catalyst: 2 },
            walls: []
          }
        }
      },
      {
        level: 11,
        title: 'Stellar Cascade',
        tip: 'Slow drift makes collisions rare. Use earned combo sparks to bridge gaps.',
        formats: {
          desktop: {
            target: 44,
            stars: [44, 55, 63],
            totalParticles: 68,
            baseSpeed: 1.3,
            speedLabel: 'Very Slow (Hard)',
            bodySizeScale: 1.0,
            parTime: 9.5,
            charges: 2,
            distribution: { standard: 28, mega: 12, splitter: 14, vortex: 10, longburner: 4 },
            walls: []
          },
          mobile: {
            target: 30,
            stars: [30, 39, 45],
            totalParticles: 48,
            baseSpeed: 1.2,
            speedLabel: 'Very Slow (Hard)',
            bodySizeScale: 1.15,
            parTime: 9.5,
            charges: 2,
            distribution: { standard: 20, mega: 8, splitter: 10, vortex: 7, longburner: 3 },
            walls: []
          }
        }
      },
      {
        level: 12,
        title: 'Supernova Oblivion',
        tip: 'The ultimate test. Slow drift requires precision timing and continuous combo bridging!',
        formats: {
          desktop: {
            target: 50,
            stars: [50, 62, 70],
            totalParticles: 75,
            baseSpeed: 1.1,
            speedLabel: 'Glacial Precision (Mastery)',
            bodySizeScale: 1.0,
            parTime: 10.0,
            charges: 2,
            distribution: { standard: 30, mega: 14, splitter: 16, vortex: 10, longburner: 3, catalyst: 2 },
            walls: []
          },
          mobile: {
            target: 34,
            stars: [34, 43, 50],
            totalParticles: 52,
            baseSpeed: 1.1,
            speedLabel: 'Glacial Precision (Mastery)',
            bodySizeScale: 1.15,
            parTime: 10.0,
            charges: 2,
            distribution: { standard: 22, mega: 10, splitter: 11, vortex: 7, longburner: 2 },
            walls: []
          }
        }
      }
    ]
  },
  {
    id: 'quantum-singularity',
    title: 'Quantum Singularity',
    tagline: 'Gravity Wells & Shard Overdrive',
    description: 'A master campaign focused on tactical vortex clustering, sniper shards, and earned sparks.',
    badge: '🔮',
    color: '#e879f9',
    author: 'GeoChain Studio',
    version: '1.0.0',
    isComingSoon: true,
    levels: []
  }
];

export const DEFAULT_CAMPAIGN = CAMPAIGNS[0];
export const CAMPAIGN_LEVELS = DEFAULT_CAMPAIGN.levels;
