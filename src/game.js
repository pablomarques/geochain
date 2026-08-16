import { Particle, Shrapnel, PARTICLE_TYPES, REFERENCE_ARENA, drawObstacleWall } from './particles.js';
import { Explosion, SparklePool } from './explosion.js';
import { ElasticSpacetimeGrid } from './grid.js';
import { CAMPAIGNS, resolveLevelConfig } from './levels.js';
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

    // Platform detection (Desktop vs. Mobile Portrait)
    this.platform = this.detectPlatform();

    // Centered Vector Arena with Proportional Scaling
    this.arena = {
      x: 0,
      y: 0,
      width: 960,
      height: 600
    };
    this.scale = 1.0;
    this.calculateArenaBounds();

    // Elastic Spacetime Grid
    this.grid = new ElasticSpacetimeGrid(this.arena, 30, this.scale);

    // Campaigns & State
    this.campaigns = CAMPAIGNS;
    this.currentCampaignId = localStorage.getItem(`cr_active_campaign_${this.platform}`) || 'genesis';
    this.currentCampaign = this.campaigns.find(c => c.id === this.currentCampaignId) || this.campaigns[0];
    this.currentLevelIndex = 0;
    this.state = 'ready';

    // Campaign Progress Map per Platform
    this.campaignProgress = this.loadCampaignProgress();

    // High Scores & Cloud Sync per Platform
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
    this.currentSpeedLabel = 'Normal';
    this.bodySizeScale = 1.0;
    this.walls = [];

    // Earned Sparks Milestones
    this.comboMilestones = [4, 8, 14, 22, 32, 45, 60];
    this.awardedMilestones = new Set();

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

  detectPlatform() {
    const w = window.innerWidth || this.width || 960;
    const h = window.innerHeight || this.height || 600;
    return (w <= 768 || h > w) ? 'mobile' : 'desktop';
  }

  loadCampaignProgress() {
    try {
      const stored = localStorage.getItem(`cr_campaign_progress_${this.platform}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return {
      genesis: {
        unlockedLevel: 1,
        levelStars: {}
      }
    };
  }

  saveCampaignProgress() {
    try {
      localStorage.setItem(`cr_campaign_progress_${this.platform}`, JSON.stringify(this.campaignProgress));
    } catch (e) {
      console.error(e);
    }
  }

  getCampaignProgress(campaignId) {
    if (!this.campaignProgress[campaignId]) {
      this.campaignProgress[campaignId] = {
        unlockedLevel: 1,
        levelStars: {}
      };
      this.saveCampaignProgress();
    }
    return this.campaignProgress[campaignId];
  }

  setCampaign(campaignId) {
    const found = this.campaigns.find(c => c.id === campaignId);
    if (!found || found.isComingSoon) return false;

    this.currentCampaignId = campaignId;
    this.currentCampaign = found;
    localStorage.setItem(`cr_active_campaign_${this.platform}`, campaignId);
    
    this.startCampaignLevel(0);
    return true;
  }

  loadLevelHighScores() {
    try {
      const stored = localStorage.getItem(`cr_level_high_scores_${this.platform}`);
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
        date: 'Aug 15'
      }));
    }
    return defaults;
  }

  saveLevelHighScores() {
    try {
      localStorage.setItem(`cr_level_high_scores_${this.platform}`, JSON.stringify(this.levelHighScores));
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
        date: 'Aug 15'
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
      platform: this.platform,
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

    this.addGlobalHighScore(tag, score, lvlNum, combo);

    // Sync to Persistent Cloud Database with Platform separation
    cloudLeaderboard.submitScore(tag, score, combo, lvlNum, this.platform);
  }

  loadGlobalHighScores() {
    try {
      const stored = localStorage.getItem(`cr_high_scores_${this.platform}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      { name: 'ACE', score: 25000, level: 12, combo: 34, date: 'Aug 15' },
      { name: 'NEO', score: 18500, level: 9, combo: 28, date: 'Aug 15' },
      { name: 'FOX', score: 16200, level: 8, combo: 22, date: 'Aug 15' },
      { name: 'VEX', score: 14200, level: 6, combo: 24, date: 'Aug 15' },
      { name: 'RAY', score: 12400, level: 5, combo: 19, date: 'Aug 15' },
      { name: 'ZEN', score: 11000, level: 3, combo: 20, date: 'Aug 15' }
    ];
  }

  saveGlobalHighScores() {
    try {
      localStorage.setItem(`cr_high_scores_${this.platform}`, JSON.stringify(this.highScores));
    } catch (e) {
      console.error(e);
    }
  }

  addGlobalHighScore(name, score, level, combo) {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tag = (name || 'ACE').substring(0, 4).toUpperCase();
    const entry = {
      name: tag,
      score,
      level,
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
    const availableWidth = Math.max(300, this.width - 24);
    const availableHeight = Math.max(220, this.height - 140);

    const isMobile = this.platform === 'mobile';
    const targetAspect = isMobile ? (9 / 16) : 1.6;

    let arenaW = availableWidth;
    let arenaH = arenaW / targetAspect;

    if (arenaH > availableHeight) {
      arenaH = availableHeight;
      arenaW = arenaH * targetAspect;
    }

    this.arena = {
      x: Math.round((this.width - arenaW) / 2),
      y: Math.round(70 + (availableHeight - arenaH) / 2),
      width: Math.round(arenaW),
      height: Math.round(arenaH)
    };

    const refW = isMobile ? 540 : REFERENCE_ARENA.width;
    this.scale = this.arena.width / refW;
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
    const oldPlatform = this.platform;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;

    this.platform = this.detectPlatform();
    if (oldPlatform !== this.platform) {
      this.campaignProgress = this.loadCampaignProgress();
      this.levelHighScores = this.loadLevelHighScores();
      this.highScores = this.loadGlobalHighScores();
    }
    
    this.calculateArenaBounds();

    this.grid.resize(this.arena, this.scale);
    this.initAmbientMotes();
    
    this.particles.forEach(p => p.rescale(this.arena, this.scale, oldArena, this.bodySizeScale));
    this.shrapnels.forEach(s => s.rescale(this.arena, this.scale, oldArena));
    this.explosions.forEach(exp => exp.rescale(this.arena, this.scale, oldArena));
  }

  startCampaignLevel(levelIndex = 0) {
    const levels = this.currentCampaign.levels;
    if (!levels || levels.length === 0) return;

    this.currentLevelIndex = Math.max(0, Math.min(levelIndex, levels.length - 1));
    const rawLvl = levels[this.currentLevelIndex];
    const lvl = resolveLevelConfig(rawLvl, this.platform);
    
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
    this.bodySizeScale = lvl.bodySizeScale || (this.platform === 'mobile' ? 1.15 : 1.0);
    this.sparkBlastScale = lvl.sparkBlastScale || 1.0;
    this.chainBlastScale = lvl.chainBlastScale || 1.0;
    this.walls = lvl.walls || [];

    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.particles = [];

    const typesToSpawn = [];
    for (const [typeId, bodySpec] of Object.entries(lvl.bodies || {})) {
      const count = typeof bodySpec === 'number' ? bodySpec : (bodySpec.count || 0);
      const size = typeof bodySpec === 'object' && bodySpec.size !== undefined ? bodySpec.size : this.bodySizeScale;
      const speedScale = typeof bodySpec === 'object' && bodySpec.speed !== undefined ? bodySpec.speed : 1.0;
      const blastScale = typeof bodySpec === 'object' && bodySpec.blast !== undefined ? bodySpec.blast : 1.0;
      for (let i = 0; i < count; i++) {
        typesToSpawn.push({ typeId, size, speedScale, blastScale });
      }
    }

    typesToSpawn.sort(() => Math.random() - 0.5);
    typesToSpawn.forEach(item => {
      const margin = 28 * this.scale;
      const x = this.arena.x + margin + Math.random() * (this.arena.width - margin * 2);
      const y = this.arena.y + margin + Math.random() * (this.arena.height - margin * 2);
      this.particles.push(new Particle(x, y, item.typeId, speed, this.arena, this.scale, item.size, item.speedScale, item.blastScale));
    });

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

    if (this.charges <= 0) return;

    soundEngine.playSeedTrigger();

    const config = {
      baseRadius: 65 * (this.sparkBlastScale || 1.0),
      baseDuration: 2.8
    };

    this.explosions.push(new Explosion(x, y, null, config, Math.random() * Math.PI, true, this.scale, 1.0));
    this.sparklePool.spawnBurst(x, y, '#38bdf8', 16, 1.1, this.scale);

    this.grid.applyExplosionImpulse(x, y, 75 * this.scale * (this.sparkBlastScale || 1.0), 70, false);

    this.charges--;
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

    if (this.isTimerRunning && this.state === 'active') {
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

    // Update Explosions & apply Spacetime Grid Warping & Vortex Forces
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.update(dt, (sx, sy) => this.spawnShrapnel(sx, sy));

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

    this.grid.update(dt);

    const config = {
      baseRadius: 65 * (this.chainBlastScale || 1.0),
      baseDuration: 2.8
    };

    // Update Particles & Collision
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.alive) continue;

      p.update(dt, 1.0, this.walls);

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

          this.explosions.push(new Explosion(p.x, p.y, p.type, config, p.rotation, false, this.scale, p.blastScale || 1.0));
          this.grid.applyExplosionImpulse(p.x, p.y, 60 * this.scale * (p.blastScale || 1.0), 50, false);

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
      shrapnel.update(dt, this.walls);

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
          this.explosions.push(new Explosion(p.x, p.y, p.type, config, p.rotation, false, this.scale, p.blastScale || 1.0));
          this.grid.applyExplosionImpulse(p.x, p.y, 50 * this.scale * (p.blastScale || 1.0), 40, false);
          
          this.sparklePool.spawnBurst(p.x, p.y, '#e879f9', 16, 1.1, this.scale);
          this.floatingTexts.push(new FloatingText(p.x, p.y, `+${points} [SHARD]`, '#e879f9', 16, false, this.scale));
          this.notifyHUD();
          break;
        }
      }
    }

    this.sparklePool.update(dt);

    for (let t = this.floatingTexts.length - 1; t >= 0; t--) {
      const ft = this.floatingTexts[t];
      ft.update(dt);
      if (!ft.alive) {
        this.floatingTexts.splice(t, 1);
      }
    }

    const remainingAlive = this.particles.filter(p => p.alive).length;
    if (this.state === 'active' && remainingAlive === 0) {
      this.finishCampaignRound(true);
      return;
    }

    if (this.state === 'active' && this.explosions.length === 0 && this.shrapnels.length === 0) {
      if (this.charges <= 0) {
        this.finishCampaignRound(false);
      }
    }
  }

  finishCampaignRound(isInstantFullWipe = false) {
    const rawLvl = this.currentCampaign.levels[this.currentLevelIndex];
    const lvlConfig = resolveLevelConfig(rawLvl, this.platform);
    const isSuccess = isInstantFullWipe || (this.explodedCount >= this.targetQuota);
    this.state = isSuccess ? 'cleared' : 'failed';
    this.isTimerRunning = false;

    const progress = this.getCampaignProgress(this.currentCampaignId);

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
      const currentStars = progress.levelStars[lvlNum] || 0;
      if (stars > currentStars) {
        progress.levelStars[lvlNum] = stars;
        this.saveCampaignProgress();
      }

      const totalLevels = this.currentCampaign.levels.length;
      if (lvlNum >= progress.unlockedLevel && lvlNum < totalLevels) {
        progress.unlockedLevel = lvlNum + 1;
        this.saveCampaignProgress();
      }

      const levelComparison = this.checkLevelComparison(lvlNum, this.score, this.highestCombo);

      if (this.callbacks.onLevelComplete) {
        this.callbacks.onLevelComplete({
          success: true,
          level: lvlNum,
          platform: this.platform,
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
          hasNextLevel: this.currentLevelIndex < totalLevels - 1,
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
          platform: this.platform,
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

  notifyHUD() {
    const progress = this.getCampaignProgress(this.currentCampaignId);
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({
        campaign: this.currentCampaign,
        platform: this.platform,
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
        activeExplosions: this.explosions.length,
        unlockedLevel: progress.unlockedLevel,
        levelStars: progress.levelStars
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

    ctx.fillStyle = 'rgba(10, 15, 26, 0.55)';
    ctx.fillRect(x, y, w, h);

    this.grid.draw(ctx);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = Math.max(1.2, 1.8 * this.scale);
    ctx.strokeRect(x, y, w, h);

    const bracketLen = Math.max(14, 24 * this.scale);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.5, 2.4 * this.scale);

    ctx.beginPath();
    ctx.moveTo(x, y + bracketLen); ctx.lineTo(x, y); ctx.lineTo(x + bracketLen, y);
    ctx.moveTo(x + w - bracketLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bracketLen);
    ctx.moveTo(x, y + h - bracketLen); ctx.lineTo(x, y + h); ctx.lineTo(x + bracketLen, y + h);
    ctx.moveTo(x + w - bracketLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bracketLen);
    ctx.stroke();

    // Obstacle Barrier Walls
    if (this.walls && this.walls.length > 0) {
      for (let i = 0; i < this.walls.length; i++) {
        const wall = this.walls[i];
        const wx1 = x + wall.x1 * w;
        const wy1 = y + wall.y1 * h;
        const wx2 = x + wall.x2 * w;
        const wy2 = y + wall.y2 * h;
        drawObstacleWall(ctx, wx1, wy1, wx2, wy2, this.scale);
      }
    }

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
