import { Particle, Shrapnel, PARTICLE_TYPES, REFERENCE_ARENA } from './particles.js';
import { Explosion, SparklePool } from './explosion.js';
import { ElasticSpacetimeGrid } from './grid.js';
import { CAMPAIGN_LEVELS } from './levels.js';
import { soundEngine } from './audio.js';
import { cloudLeaderboard } from './leaderboard.js';

export class FloatingText {
  constructor(x, y, text, color = '#ffffff', fontSize = 16, isCombo = false, scale = 1.0) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.scaleFactor = Math.max(0.6, scale);
    this.fontSize = Math.round(fontSize * this.scaleFactor);
    this.isCombo = isCombo;
    this.alpha = 1.0;
    this.life = 0;
    this.maxLife = isCombo ? 1.3 : 0.85;
    this.vy = (isCombo ? -0.8 : -1.1) * this.scaleFactor;
    this.scale = isCombo ? 1.25 : 1.0;
    this.alive = true;
  }

  update(dt) {
    this.life += dt;
    this.y += this.vy * (dt * 60);
    if (this.isCombo) {
      this.scale = Math.max(1.0, this.scale - dt * 0.4);
    }
    const progress = this.life / this.maxLife;
    this.alpha = Math.max(0, 1 - Math.pow(progress, 2));
    if (this.life >= this.maxLife) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = `${this.isCombo ? 'bold ' : ''}${Math.round(this.fontSize * this.scale)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ChainReactionGame {
  constructor(canvas, hudCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = hudCallbacks || {};

    this.width = canvas.width;
    this.height = canvas.height;

    // Centered Vector Arena with Proportional Scaling (16:10 aspect ratio)
    this.arena = {
      x: 0,
      y: 0,
      width: 960,
      height: 600
    };
    this.scale = 1.0;
    this.calculateArenaBounds();

    // Elastic Spacetime Grid with Proportional Scaling
    this.grid = new ElasticSpacetimeGrid(this.arena, 30, this.scale);

    // Mode & State
    this.mode = 'campaign';
    this.state = 'ready';

    // Campaign State
    this.currentLevelIndex = 0;
    this.unlockedLevel = parseInt(localStorage.getItem('cr_unlocked_level') || '1', 10);
    this.levelStars = JSON.parse(localStorage.getItem('cr_level_stars') || '{}');

    // High Scores & Cloud Sync
    this.levelHighScores = this.loadLevelHighScores();
    this.highScores = this.loadGlobalHighScores();

    // Round Stats
    this.score = 0;
    this.baseScore = 0;
    this.comboChain = 0;
    this.highestCombo = 0;
    this.explodedCount = 0;
    this.totalParticles = 0;
    this.targetQuota = 0;
    this.charges = 1;
    this.roundTimeElapsed = 0;
    this.isTimerRunning = false;
    this.currentSpeedLabel = 'High Velocity (Easy)';

    // Earned Sparks Milestones
    this.comboMilestones = [4, 8, 14, 22, 32, 45, 60];
    this.awardedMilestones = new Set();

    // Endless Zen Stats
    this.endlessEnergy = 100;
    this.endlessEnergyRate = 20;

    // Chaos Mode Stats
    this.chaosTimeLeft = 25.0;

    // Physics Configuration (Defined in 960x600 Reference Units)
    this.sandboxConfig = {
      particleCount: 36,
      baseRadius: 65,
      baseDuration: 2.8,
      particleSpeed: 2.4,
      enabledTypes: ['standard', 'mega', 'splitter', 'vortex', 'longburner', 'speedster', 'catalyst']
    };

    // Pre-allocated High-Performance Sparkle Pool
    this.sparklePool = new SparklePool(450);

    // Entities
    this.particles = [];
    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.ambientMotes = [];

    // Screen Shake
    this.shakeTime = 0;
    this.shakeIntensity = 0;

    this.initAmbientMotes();
  }

  loadLevelHighScores() {
    try {
      const stored = localStorage.getItem('cr_level_high_scores');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const defaults = {};
    const arcadeNames = ['ACE', 'NEO', 'VEX', 'ZEN', 'ARC', 'FOX', 'RAY', 'ION', 'LUM', 'GEO'];
    
    for (let lvl = 1; lvl <= 12; lvl++) {
      const base = lvl * 1800 + 800;
      defaults[lvl] = arcadeNames.map((name, i) => ({
        name,
        score: Math.round(base * (1.65 - i * 0.09)),
        combo: Math.max(3, Math.round(lvl * 2.2 + (10 - i))),
        date: 'Aug 14'
      }));
    }
    return defaults;
  }

  saveLevelHighScores() {
    try {
      localStorage.setItem('cr_level_high_scores', JSON.stringify(this.levelHighScores));
    } catch (e) {
      console.error(e);
    }
  }

  getLevelTop10(lvlNum) {
    if (!this.levelHighScores[lvlNum]) {
      const base = lvlNum * 1800 + 800;
      const arcadeNames = ['ACE', 'NEO', 'VEX', 'ZEN', 'ARC', 'FOX', 'RAY', 'ION', 'LUM', 'GEO'];
      this.levelHighScores[lvlNum] = arcadeNames.map((name, i) => ({
        name,
        score: Math.round(base * (1.65 - i * 0.09)),
        combo: Math.max(3, Math.round(lvlNum * 2.2 + (10 - i))),
        date: 'Aug 14'
      }));
      this.saveLevelHighScores();
    }
    return [...this.levelHighScores[lvlNum]];
  }

  checkLevelComparison(lvlNum, score, combo) {
    const list = this.getLevelTop10(lvlNum);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    let rank = list.filter(item => item.score >= score).length + 1;
    const qualifies = rank <= 10;

    return {
      level: lvlNum,
      score,
      combo,
      date: dateStr,
      rank,
      qualifies,
      top10: list
    };
  }

  addLevelHighScore(lvlNum, name, score, combo) {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const list = this.getLevelTop10(lvlNum);
    const tag = (name || 'ACE').substring(0, 4).toUpperCase();
    
    const entry = {
      name: tag,
      score,
      combo,
      date: dateStr
    };

    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    this.levelHighScores[lvlNum] = list.slice(0, 10);
    this.saveLevelHighScores();

    this.addGlobalHighScore(tag, score, 'Campaign', lvlNum, combo);

    // Sync to Persistent Cloud Database
    cloudLeaderboard.submitScore(tag, score, combo, lvlNum, 'Campaign');
  }

  loadGlobalHighScores() {
    try {
      const stored = localStorage.getItem('cr_high_scores');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      { name: 'ACE', score: 25000, mode: 'Campaign', level: 12, combo: 34, date: 'Aug 14' },
      { name: 'NEO', score: 18500, mode: 'Campaign', level: 9, combo: 28, date: 'Aug 14' },
      { name: 'VEX', score: 14200, mode: 'Chaos', level: 1, combo: 24, date: 'Aug 14' },
      { name: 'ZEN', score: 11000, mode: 'Endless', level: 1, combo: 20, date: 'Aug 14' },
      { name: 'ARC', score: 8500, mode: 'Campaign', level: 5, combo: 16, date: 'Aug 14' }
    ];
  }

  saveGlobalHighScores() {
    try {
      localStorage.setItem('cr_high_scores', JSON.stringify(this.highScores));
    } catch (e) {
      console.error(e);
    }
  }

  addGlobalHighScore(name, score, mode, level, combo) {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tag = (name || 'ACE').substring(0, 4).toUpperCase();
    const entry = {
      name: tag,
      score,
      mode: mode.charAt(0).toUpperCase() + mode.slice(1),
      level: mode === 'Campaign' ? level : 1,
      combo,
      date: dateStr
    };

    this.highScores.push(entry);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 10);
    this.saveGlobalHighScores();
  }

  clearHighScores() {
    this.highScores = [];
    this.levelHighScores = {};
    this.saveGlobalHighScores();
    this.saveLevelHighScores();
  }

  calculateArenaBounds() {
    const availableWidth = Math.max(320, this.width - 40);
    const availableHeight = Math.max(240, this.height - 150);

    let arenaW = Math.min(availableWidth, availableHeight * 1.6);
    let arenaH = arenaW / 1.6;

    if (arenaH > availableHeight) {
      arenaH = availableHeight;
      arenaW = arenaH * 1.6;
    }

    this.arena = {
      x: Math.round((this.width - arenaW) / 2),
      y: Math.round(75 + (availableHeight - arenaH) / 2),
      width: Math.round(arenaW),
      height: Math.round(arenaH)
    };

    // Calculate Physical Scale Ratio Relative to Reference 960x600 Arena
    this.scale = this.arena.width / REFERENCE_ARENA.width;
  }

  initAmbientMotes() {
    this.ambientMotes = [];
    for (let i = 0; i < 40; i++) {
      this.ambientMotes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 0.8 + Math.random() * 1.5,
        alpha: 0.12 + Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2
      });
    }
  }

  resize(w, h) {
    const oldArena = { ...this.arena };
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    
    this.calculateArenaBounds();

    // Rescale All Entities and Spacetime Grid
    this.grid.resize(this.arena, this.scale);
    this.initAmbientMotes();
    
    this.particles.forEach(p => p.rescale(this.arena, this.scale, oldArena));
    this.shrapnels.forEach(s => s.rescale(this.arena, this.scale, oldArena));
    this.explosions.forEach(exp => exp.rescale(this.arena, this.scale, oldArena));
  }

  startCampaignLevel(levelIndex = 0) {
    this.mode = 'campaign';
    this.currentLevelIndex = Math.max(0, Math.min(levelIndex, CAMPAIGN_LEVELS.length - 1));
    const lvl = CAMPAIGN_LEVELS[this.currentLevelIndex];
    
    this.state = 'ready';
    this.explodedCount = 0;
    this.comboChain = 0;
    this.highestCombo = 0;
    this.score = 0;
    this.baseScore = 0;
    this.targetQuota = lvl.target;
    this.totalParticles = lvl.totalParticles;
    this.charges = lvl.charges || 1;
    this.roundTimeElapsed = 0;
    this.isTimerRunning = false;
    this.awardedMilestones.clear();

    const speed = lvl.baseSpeed || 2.4;
    this.currentSpeedLabel = lvl.speedLabel || 'Normal';

    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.particles = [];

    const typesToSpawn = [];
    for (const [typeId, count] of Object.entries(lvl.distribution)) {
      for (let i = 0; i < count; i++) {
        typesToSpawn.push(typeId);
      }
    }

    typesToSpawn.sort(() => Math.random() - 0.5);
    typesToSpawn.forEach(typeId => {
      const margin = 30 * this.scale;
      const x = this.arena.x + margin + Math.random() * (this.arena.width - margin * 2);
      const y = this.arena.y + margin + Math.random() * (this.arena.height - margin * 2);
      this.particles.push(new Particle(x, y, typeId, speed, this.arena, this.scale));
    });

    this.notifyHUD();
  }

  startEndlessMode() {
    this.mode = 'endless';
    this.state = 'active';
    this.explodedCount = 0;
    this.comboChain = 0;
    this.score = 0;
    this.baseScore = 0;
    this.highestCombo = 0;
    this.charges = 1;
    this.endlessEnergy = 100;
    this.totalParticles = 36;
    this.roundTimeElapsed = 0;
    this.isTimerRunning = true;
    this.currentSpeedLabel = 'Zen';
    this.awardedMilestones.clear();

    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.particles = [];

    const types = ['standard', 'standard', 'mega', 'splitter', 'vortex', 'longburner', 'speedster', 'catalyst'];
    for (let i = 0; i < this.totalParticles; i++) {
      const typeId = types[Math.floor(Math.random() * types.length)];
      const x = this.arena.x + 30 * this.scale + Math.random() * (this.arena.width - 60 * this.scale);
      const y = this.arena.y + 30 * this.scale + Math.random() * (this.arena.height - 60 * this.scale);
      this.particles.push(new Particle(x, y, typeId, 2.5, this.arena, this.scale));
    }

    this.notifyHUD();
  }

  startChaosMode() {
    this.mode = 'chaos';
    this.state = 'active';
    this.chaosTimeLeft = 25.0;
    this.explodedCount = 0;
    this.comboChain = 0;
    this.highestCombo = 0;
    this.score = 0;
    this.baseScore = 0;
    this.charges = 1;
    this.totalParticles = 44;
    this.roundTimeElapsed = 0;
    this.isTimerRunning = true;
    this.currentSpeedLabel = 'Hyper';
    this.awardedMilestones.clear();

    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.particles = [];

    const types = ['standard', 'mega', 'splitter', 'vortex', 'longburner', 'speedster', 'catalyst'];
    for (let i = 0; i < this.totalParticles; i++) {
      const typeId = types[Math.floor(Math.random() * types.length)];
      const x = this.arena.x + 30 * this.scale + Math.random() * (this.arena.width - 60 * this.scale);
      const y = this.arena.y + 30 * this.scale + Math.random() * (this.arena.height - 60 * this.scale);
      this.particles.push(new Particle(x, y, typeId, 3.2, this.arena, this.scale));
    }

    this.notifyHUD();
  }

  startSandboxMode() {
    this.mode = 'sandbox';
    this.state = 'ready';
    this.explodedCount = 0;
    this.comboChain = 0;
    this.highestCombo = 0;
    this.score = 0;
    this.baseScore = 0;
    this.charges = 999;
    this.roundTimeElapsed = 0;
    this.isTimerRunning = false;
    this.currentSpeedLabel = 'Custom';
    this.awardedMilestones.clear();

    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.particles = [];

    const available = this.sandboxConfig.enabledTypes.length > 0 ? this.sandboxConfig.enabledTypes : ['standard'];
    this.totalParticles = this.sandboxConfig.particleCount;

    for (let i = 0; i < this.totalParticles; i++) {
      const typeId = available[Math.floor(Math.random() * available.length)];
      const x = this.arena.x + 30 * this.scale + Math.random() * (this.arena.width - 60 * this.scale);
      const y = this.arena.y + 30 * this.scale + Math.random() * (this.arena.height - 60 * this.scale);
      this.particles.push(new Particle(x, y, typeId, this.sandboxConfig.particleSpeed, this.arena, this.scale));
    }

    this.notifyHUD();
  }

  triggerExplosion(x, y) {
    if (
      x < this.arena.x ||
      x > this.arena.x + this.arena.width ||
      y < this.arena.y ||
      y > this.arena.y + this.arena.height
    ) {
      return;
    }

    if (this.charges <= 0 && this.mode !== 'sandbox') return;

    if (this.mode === 'endless' && this.endlessEnergy < 100 && this.state === 'active') {
      return;
    }

    soundEngine.playSeedTrigger();

    const config = {
      baseRadius: this.sandboxConfig.baseRadius,
      baseDuration: this.sandboxConfig.baseDuration
    };

    this.explosions.push(new Explosion(x, y, null, config, Math.random() * Math.PI, true, this.scale));
    this.sparklePool.spawnBurst(x, y, '#38bdf8', 16, 1.1, this.scale);

    // Initial grid kinetic impulse
    this.grid.applyExplosionImpulse(x, y, 75 * this.scale, 70, false);

    if (this.mode === 'endless') {
      this.endlessEnergy = 0;
    } else if (this.mode !== 'sandbox') {
      this.charges--;
    }

    this.state = 'active';
    this.isTimerRunning = true;
    this.notifyHUD();
  }

  addScreenShake(intensity = 5, duration = 0.2) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity * this.scale);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  spawnShrapnel(x, y) {
    const dartCount = 4;
    for (let i = 0; i < dartCount; i++) {
      const angle = (Math.PI * 2 / dartCount) * i + (Math.random() * 0.3 - 0.15);
      this.shrapnels.push(new Shrapnel(x, y, angle, 8.5, this.arena, this.scale));
    }
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) {
        this.shakeIntensity = 0;
      }
    }

    if (this.isTimerRunning && (this.state === 'active' || this.mode === 'chaos' || this.mode === 'endless')) {
      this.roundTimeElapsed += dt;
    }

    // Ambient Motes
    const dt60 = dt * 60;
    for (let i = 0; i < this.ambientMotes.length; i++) {
      const m = this.ambientMotes[i];
      m.x += m.vx * dt60;
      m.y += m.vy * dt60;
      if (m.x < 0) m.x = this.width;
      else if (m.x > this.width) m.x = 0;
      if (m.y < 0) m.y = this.height;
      else if (m.y > this.height) m.y = 0;
    }

    // Endless Mode
    if (this.mode === 'endless') {
      if (this.endlessEnergy < 100) {
        this.endlessEnergy = Math.min(100, this.endlessEnergy + this.endlessEnergyRate * dt);
        this.notifyHUD();
      }
      const aliveCount = this.particles.filter(p => p.alive).length;
      if (aliveCount < 28) {
        const types = ['standard', 'standard', 'mega', 'splitter', 'vortex', 'longburner', 'speedster', 'catalyst'];
        const typeId = types[Math.floor(Math.random() * types.length)];
        const edge = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        if (edge === 0) { x = this.arena.x + Math.random() * this.arena.width; y = this.arena.y + 5; }
        else if (edge === 1) { x = this.arena.x + this.arena.width - 5; y = this.arena.y + Math.random() * this.arena.height; }
        else if (edge === 2) { x = this.arena.x + Math.random() * this.arena.width; y = this.arena.y + this.arena.height - 5; }
        else { x = this.arena.x + 5; y = this.arena.y + Math.random() * this.arena.height; }
        this.particles.push(new Particle(x, y, typeId, 2.5, this.arena, this.scale));
      }
    }

    // Chaos Mode
    if (this.mode === 'chaos' && this.state === 'active') {
      this.chaosTimeLeft -= dt;
      if (this.chaosTimeLeft <= 0) {
        this.chaosTimeLeft = 0;
        this.finishChaosMode();
      }
      this.notifyHUD();
    }

    // Update Explosions & apply Spacetime Grid Warping & Vortex Forces
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.update(dt, (sx, sy) => this.spawnShrapnel(sx, sy));

      // Warp Elastic Grid
      if (exp.active) {
        const force = exp.isVortex ? 65 : 45;
        this.grid.applyExplosionImpulse(exp.x, exp.y, exp.currentRadius, force, exp.isVortex);
      }

      if (exp.isVortex && exp.active) {
        for (let j = 0; j < this.particles.length; j++) {
          const p = this.particles[j];
          if (p.alive) {
            p.applyForce(exp.x, exp.y, exp.vortexForce, dt);
          }
        }
      }

      if (!exp.alive) {
        this.explosions.splice(i, 1);
      }
    }

    // Update Elastic Grid Springs (120 FPS physics)
    this.grid.update(dt);

    const config = {
      baseRadius: this.sandboxConfig.baseRadius,
      baseDuration: this.sandboxConfig.baseDuration
    };

    // Update Particles & Collision
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.alive) continue;

      p.update(dt, 1.0);

      for (let e = 0; e < this.explosions.length; e++) {
        const exp = this.explosions[e];
        if (exp.checkCollision(p)) {
          p.alive = false;
          this.explodedCount++;
          this.comboChain++;
          if (this.comboChain > this.highestCombo) {
            this.highestCombo = this.comboChain;
          }

          const logBonus = Math.floor(Math.log2(Math.max(1, this.comboChain))) * 0.5;
          const linearBonus = this.comboChain * 0.25;
          const multiplier = 1 + logBonus + linearBonus;
          const pointsGained = Math.round(p.type.basePoints * multiplier);
          
          this.baseScore += p.type.basePoints;
          this.score += pointsGained;

          soundEngine.playExplosionChime(this.comboChain, p.type.id);

          this.explosions.push(new Explosion(p.x, p.y, p.type, config, p.rotation, false, this.scale));

          // Distortion ripple on detonation
          this.grid.applyExplosionImpulse(p.x, p.y, 60 * this.scale, 50, false);

          const sparkleCount = Math.min(28, 16 + this.comboChain);
          this.sparklePool.spawnBurst(p.x, p.y, p.type.color, sparkleCount, 1.0 + Math.min(0.4, this.comboChain * 0.02), this.scale);

          if (this.comboChain >= 5) {
            this.sparklePool.spawnBurst(p.x, p.y, '#ffffff', 6, 1.2, this.scale);
          }

          // Earned Sparks System
          for (let m = 0; m < this.comboMilestones.length; m++) {
            const milestone = this.comboMilestones[m];
            if (this.comboChain >= milestone && !this.awardedMilestones.has(milestone)) {
              this.awardedMilestones.add(milestone);
              this.charges++;
              this.floatingTexts.push(new FloatingText(p.x, p.y - 30 * this.scale, '+1 SPARK EARNED!', '#fef08a', 20, true, this.scale));
              break;
            }
          }

          if (p.type.givesCharge) {
            this.charges++;
            this.floatingTexts.push(new FloatingText(p.x, p.y - 20 * this.scale, '+1 CATALYST SPARK!', '#ffffff', 20, true, this.scale));
          }

          if (this.mode === 'chaos') {
            this.chaosTimeLeft = Math.min(60, this.chaosTimeLeft + 0.45);
          }

          this.floatingTexts.push(new FloatingText(p.x, p.y, `+${pointsGained}`, p.type.color, 15, false, this.scale));

          if (this.comboChain % 5 === 0) {
            this.addScreenShake(Math.min(9, 3 + this.comboChain * 0.3), 0.22);
            this.floatingTexts.push(new FloatingText(p.x, p.y - 15 * this.scale, `x${this.comboChain} CHAIN!`, '#ffffff', 22, true, this.scale));
          }

          this.notifyHUD();
          break;
        }
      }
    }

    // Update Shrapnels
    for (let s = this.shrapnels.length - 1; s >= 0; s--) {
      const shrapnel = this.shrapnels[s];
      shrapnel.update(dt);

      if (!shrapnel.alive) {
        this.shrapnels.splice(s, 1);
        continue;
      }

      for (let pIdx = 0; pIdx < this.particles.length; pIdx++) {
        const p = this.particles[pIdx];
        if (!p.alive) continue;
        const dx = shrapnel.x - p.x;
        const dy = shrapnel.y - p.y;
        const distSq = dx * dx + dy * dy;
        const combined = shrapnel.radius + p.radius;
        if (distSq <= combined * combined) {
          shrapnel.alive = false;
          p.alive = false;
          this.explodedCount++;
          this.comboChain++;
          if (this.comboChain > this.highestCombo) this.highestCombo = this.comboChain;

          const multiplier = 1 + Math.floor(Math.log2(Math.max(1, this.comboChain))) * 0.5 + this.comboChain * 0.25;
          const points = Math.round(p.type.basePoints * multiplier);
          this.score += points;

          soundEngine.playExplosionChime(this.comboChain, p.type.id);
          this.explosions.push(new Explosion(p.x, p.y, p.type, config, p.rotation, false, this.scale));
          this.grid.applyExplosionImpulse(p.x, p.y, 50 * this.scale, 40, false);
          
          this.sparklePool.spawnBurst(p.x, p.y, '#e879f9', 16, 1.1, this.scale);
          this.floatingTexts.push(new FloatingText(p.x, p.y, `+${points} [SHARD]`, '#e879f9', 16, false, this.scale));
          this.notifyHUD();
          break;
        }
      }
    }

    // Update Sparkle Pool
    this.sparklePool.update(dt);

    // Update Floating Texts
    for (let t = this.floatingTexts.length - 1; t >= 0; t--) {
      const ft = this.floatingTexts[t];
      ft.update(dt);
      if (!ft.alive) {
        this.floatingTexts.splice(t, 1);
      }
    }

    // Instant Win Check on 100% Board Wipe
    const remainingAlive = this.particles.filter(p => p.alive).length;
    if (this.mode === 'campaign' && this.state === 'active') {
      if (remainingAlive === 0) {
        this.finishCampaignRound(true);
        return;
      }
    }

    // Normal Round End check
    if (this.state === 'active' && this.explosions.length === 0 && this.shrapnels.length === 0) {
      if (this.charges <= 0 && this.mode === 'campaign') {
        this.finishCampaignRound(false);
      } else if (this.mode === 'endless' || this.mode === 'sandbox') {
        this.comboChain = 0;
      }
    }
  }

  finishCampaignRound(isInstantFullWipe = false) {
    const lvlConfig = CAMPAIGN_LEVELS[this.currentLevelIndex];
    const isSuccess = isInstantFullWipe || (this.explodedCount >= this.targetQuota);
    this.state = isSuccess ? 'cleared' : 'failed';
    this.isTimerRunning = false;

    if (isSuccess) {
      soundEngine.playVictory();

      const starThresholds = lvlConfig.stars || [lvlConfig.target, Math.round(lvlConfig.totalParticles * 0.5), Math.round(lvlConfig.totalParticles * 0.75)];
      let stars = 1;
      if (this.explodedCount >= starThresholds[2]) stars = 3;
      else if (this.explodedCount >= starThresholds[1]) stars = 2;
      else if (this.explodedCount >= starThresholds[0]) stars = 1;

      const par = lvlConfig.parTime || 6.0;
      let speedMultiplier = 1.0;
      if (this.roundTimeElapsed < par) {
        const timeDiff = par - this.roundTimeElapsed;
        speedMultiplier = 1.0 + Math.min(1.5, (timeDiff / par) * 1.5);
      }

      const spareChargeBonus = this.charges * 2500;
      const finalScore = Math.round(this.score * speedMultiplier) + spareChargeBonus;
      this.score = finalScore;

      const lvlNum = this.currentLevelIndex + 1;
      const currentStars = this.levelStars[lvlNum] || 0;
      if (stars > currentStars) {
        this.levelStars[lvlNum] = stars;
        localStorage.setItem('cr_level_stars', JSON.stringify(this.levelStars));
      }

      if (lvlNum >= this.unlockedLevel && lvlNum < CAMPAIGN_LEVELS.length) {
        this.unlockedLevel = lvlNum + 1;
        localStorage.setItem('cr_unlocked_level', this.unlockedLevel.toString());
      }

      const levelComparison = this.checkLevelComparison(lvlNum, this.score, this.highestCombo);

      if (this.callbacks.onLevelComplete) {
        this.callbacks.onLevelComplete({
          success: true,
          level: lvlNum,
          exploded: this.explodedCount,
          total: this.totalParticles,
          target: this.targetQuota,
          stars,
          starThresholds,
          timeTaken: this.roundTimeElapsed.toFixed(2),
          speedMultiplier: speedMultiplier.toFixed(2),
          chargesLeft: this.charges,
          chargeBonus: spareChargeBonus,
          score: this.score,
          isFullWipe: isInstantFullWipe || (this.explodedCount === this.totalParticles),
          hasNextLevel: this.currentLevelIndex < CAMPAIGN_LEVELS.length - 1,
          levelComparison
        });
      }
    } else {
      soundEngine.playDefeat();
      const lvlNum = this.currentLevelIndex + 1;
      const levelComparison = this.checkLevelComparison(lvlNum, this.score, this.highestCombo);

      if (this.callbacks.onLevelComplete) {
        this.callbacks.onLevelComplete({
          success: false,
          level: lvlNum,
          exploded: this.explodedCount,
          total: this.totalParticles,
          target: this.targetQuota,
          stars: 0,
          starThresholds: lvlConfig.stars,
          score: this.score,
          hasNextLevel: false,
          levelComparison
        });
      }
    }
  }

  finishChaosMode() {
    this.state = 'cleared';
    this.isTimerRunning = false;
    soundEngine.playVictory();
    const levelComparison = this.checkLevelComparison('Chaos', this.score, this.highestCombo);
    if (this.callbacks.onChaosComplete) {
      this.callbacks.onChaosComplete({
        score: this.score,
        exploded: this.explodedCount,
        highestCombo: this.highestCombo,
        levelComparison
      });
    }
  }

  notifyHUD() {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({
        mode: this.mode,
        state: this.state,
        level: this.currentLevelIndex + 1,
        score: this.score,
        combo: this.comboChain,
        highestCombo: this.highestCombo,
        exploded: this.explodedCount,
        total: this.totalParticles,
        target: this.targetQuota,
        charges: this.charges,
        speedLabel: this.currentSpeedLabel,
        endlessEnergy: this.endlessEnergy,
        chaosTimeLeft: this.chaosTimeLeft,
        activeExplosions: this.explosions.length,
        unlockedLevel: this.unlockedLevel,
        levelStars: this.levelStars
      });
    }
  }

  // 120 FPS Batched Render Pipeline
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    if (this.shakeIntensity > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(offsetX, offsetY);
    }

    // 1. Ambient Background Stars
    ctx.save();
    ctx.fillStyle = '#334155';
    for (let i = 0; i < this.ambientMotes.length; i++) {
      const m = this.ambientMotes[i];
      ctx.globalAlpha = m.alpha;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * Math.max(0.6, this.scale), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Geometry Wars Glowing Vector Arena & Elastic Spacetime Grid
    const { x, y, width: w, height: h } = this.arena;
    ctx.save();

    // Dark surface background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.55)';
    ctx.fillRect(x, y, w, h);

    // Render Elastic Spacetime Grid
    this.grid.draw(ctx);

    // Glowing Neon Perimeter Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = Math.max(1.2, 1.8 * this.scale);
    ctx.strokeRect(x, y, w, h);

    // Corner Brackets
    const bracketLen = Math.max(14, 24 * this.scale);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.5, 2.4 * this.scale);

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + bracketLen); ctx.lineTo(x, y); ctx.lineTo(x + bracketLen, y);
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - bracketLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bracketLen);
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - bracketLen); ctx.lineTo(x, y + h); ctx.lineTo(x + bracketLen, y + h);
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - bracketLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bracketLen);
    ctx.stroke();

    ctx.restore();

    // 3. Shape-Conforming Hollow Explosions
    for (let i = 0; i < this.explosions.length; i++) {
      this.explosions[i].draw(ctx);
    }

    // 4. Shrapnel Shards
    for (let i = 0; i < this.shrapnels.length; i++) {
      this.shrapnels[i].draw(ctx);
    }

    // 5. Pure Hollow Polygonal Bodies
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    // 6. Batched Sparkle Pool Draw
    this.sparklePool.draw(ctx);

    // 7. Floating Score/Text
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(ctx);
    }

    ctx.restore();
  }
}
