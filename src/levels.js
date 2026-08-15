/**
 * GeoChain Campaign & Level Architecture
 * Campaigns represent curated sequences of geometric cascade levels.
 */

export const CAMPAIGNS = [
  {
    id: 'genesis',
    title: 'Genesis Odyssey',
    tagline: 'The Core Geometric Cascade',
    description: 'Master the fundamental harmonics of geometric chain reactions through 12 calibrated velocity stages.',
    badge: '🌌',
    color: '#38bdf8', // Neon Sky Cyan
    author: 'GeoChain Studio',
    version: '1.0.0',
    levels: [
      {
        level: 1,
        title: 'First Sparks',
        target: 1,
        stars: [1, 3, 5],
        totalParticles: 8,
        baseSpeed: 4.6,
        speedLabel: 'High Velocity (Easy)',
        parTime: 4.5,
        charges: 1,
        distribution: { standard: 8 },
        tip: 'High velocity! Bodies cross the arena quickly and easily collide into your spark.'
      },
      {
        level: 2,
        title: 'Dual Swarms',
        target: 3,
        stars: [3, 6, 10],
        totalParticles: 14,
        baseSpeed: 4.2,
        speedLabel: 'Swift',
        parTime: 5.0,
        charges: 1,
        distribution: { standard: 14 },
        tip: 'Fast swarms ensure high encounter rates across the arena.'
      },
      {
        level: 3,
        title: 'Diamond Core',
        target: 6,
        stars: [6, 11, 16],
        totalParticles: 20,
        baseSpeed: 3.8,
        speedLabel: 'Brisk',
        parTime: 5.5,
        charges: 1,
        distribution: { standard: 15, mega: 5 },
        tip: 'Amber Diamonds create huge square blast fields to catch swift geometries.'
      },
      {
        level: 4,
        title: 'Nova Shards',
        target: 9,
        stars: [9, 15, 21],
        totalParticles: 26,
        baseSpeed: 3.4,
        speedLabel: 'Rapid',
        parTime: 6.0,
        charges: 1,
        distribution: { standard: 17, mega: 3, splitter: 6 },
        tip: 'Fuchsia Stars fire 4 fast diamond shards to bridge distant clusters.'
      },
      {
        level: 5,
        title: 'Pentagon Embers',
        target: 13,
        stars: [13, 20, 27],
        totalParticles: 32,
        baseSpeed: 3.0,
        speedLabel: 'Moderate',
        parTime: 6.5,
        charges: 1,
        distribution: { standard: 19, mega: 4, splitter: 4, longburner: 5 },
        tip: 'Speed is moderate. Gold Pentagons linger 2.8x longer to keep chains alive.'
      },
      {
        level: 6,
        title: 'Hex Singularity',
        target: 18,
        stars: [18, 26, 33],
        totalParticles: 38,
        baseSpeed: 2.6,
        speedLabel: 'Cruising',
        parTime: 7.0,
        charges: 1,
        distribution: { standard: 20, mega: 4, splitter: 6, vortex: 8 },
        tip: 'As speeds slow, use Emerald Hexagons to pull bodies inward.'
      },
      {
        level: 7,
        title: 'Delta Velocity',
        target: 22,
        stars: [22, 31, 39],
        totalParticles: 44,
        baseSpeed: 2.3,
        speedLabel: 'Steady',
        parTime: 7.5,
        charges: 1,
        distribution: { standard: 22, speedster: 12, splitter: 5, longburner: 5 },
        tip: 'Electric Blue Chevrons retain high speed—use them to hit slower bodies.'
      },
      {
        level: 8,
        title: 'Prism Overcharge',
        target: 27,
        stars: [27, 37, 45],
        totalParticles: 50,
        baseSpeed: 2.0,
        speedLabel: 'Deliberate',
        parTime: 8.0,
        charges: 1,
        distribution: { standard: 24, mega: 6, splitter: 7, vortex: 7, catalyst: 6 },
        tip: 'Slower drift requires calculated spark timing. Catalyst Octagons grant +1 spark.'
      },
      {
        level: 9,
        title: 'Vortex Resonance',
        target: 32,
        stars: [32, 42, 51],
        totalParticles: 56,
        baseSpeed: 1.7,
        speedLabel: 'Slow',
        parTime: 8.5,
        charges: 1,
        distribution: { standard: 26, mega: 8, vortex: 12, splitter: 6, longburner: 4 },
        tip: 'Slow movement. Chain multiple vortexes together to compress the field.'
      },
      {
        level: 10,
        title: 'Critical Geometry',
        target: 38,
        stars: [38, 49, 57],
        totalParticles: 62,
        baseSpeed: 1.5,
        speedLabel: 'Calm Drift',
        parTime: 9.0,
        charges: 2,
        distribution: { standard: 26, mega: 10, splitter: 12, vortex: 8, speedster: 4, catalyst: 2 },
        tip: '2 starting Sparks! Stagger your triggers to cover distant slow swarms.'
      },
      {
        level: 11,
        title: 'Stellar Cascade',
        target: 44,
        stars: [44, 55, 63],
        totalParticles: 68,
        baseSpeed: 1.3,
        speedLabel: 'Very Slow (Hard)',
        parTime: 9.5,
        charges: 2,
        distribution: { standard: 28, mega: 12, splitter: 14, vortex: 10, longburner: 4 },
        tip: 'Slow drift makes collisions rare. Use earned combo sparks to bridge gaps.'
      },
      {
        level: 12,
        title: 'Supernova Oblivion',
        target: 50,
        stars: [50, 62, 70],
        totalParticles: 75,
        baseSpeed: 1.1,
        speedLabel: 'Glacial Precision (Mastery)',
        parTime: 10.0,
        charges: 2,
        distribution: { standard: 30, mega: 14, splitter: 16, vortex: 10, longburner: 3, catalyst: 2 },
        tip: 'The ultimate test. Slow drift requires precision timing and continuous combo bridging!'
      }
    ]
  },
  {
    id: 'quantum-singularity',
    title: 'Quantum Singularity',
    tagline: 'Gravity Wells & Shard Overdrive',
    description: 'A master campaign focused on tactical vortex clustering, sniper shards, and earned sparks.',
    badge: '🔮',
    color: '#e879f9', // Neon Fuchsia
    author: 'GeoChain Studio',
    version: '1.0.0',
    isComingSoon: true,
    levels: []
  }
];

export const DEFAULT_CAMPAIGN = CAMPAIGNS[0];
export const CAMPAIGN_LEVELS = DEFAULT_CAMPAIGN.levels;
