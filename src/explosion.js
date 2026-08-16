/**
 * High-Performance Geometry Wars Explosion & Sparkle Engine
 * Resolution-Independent Physical Scaling (Zero Aspect-Ratio / Resizing Exploits)
 */

export class SparklePool {
  constructor(maxSparkles = 450) {
    this.maxSparkles = maxSparkles;
    this.sparkles = [];
    for (let i = 0; i < maxSparkles; i++) {
      this.sparkles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#38bdf8',
        alpha: 0,
        decay: 0.03,
        twinklePhase: 0,
        twinkleSpeed: 20,
        streakLength: 3.0,
        glintSize: 2.5,
        scale: 1.0,
        alive: false
      });
    }
    this.nextIndex = 0;
  }

  spawn(x, y, color, speedMultiplier = 1.0, scale = 1.0) {
    const sp = this.sparkles[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.maxSparkles;

    const angle = Math.random() * Math.PI * 2;
    const speed = (4.5 + Math.random() * 8.0) * speedMultiplier * scale;

    sp.x = x;
    sp.y = y;
    sp.vx = Math.cos(angle) * speed;
    sp.vy = Math.sin(angle) * speed;
    sp.color = color;
    sp.alpha = 1.0;
    sp.decay = 0.026 + Math.random() * 0.028;
    sp.twinklePhase = Math.random() * Math.PI * 2;
    sp.twinkleSpeed = 16 + Math.random() * 20;
    sp.streakLength = (2.5 + Math.random() * 2.2) * scale;
    sp.glintSize = (2.0 + Math.random() * 2.2) * scale;
    sp.scale = scale;
    sp.alive = true;
  }

  spawnBurst(x, y, color, count = 20, speedMultiplier = 1.0, scale = 1.0) {
    for (let i = 0; i < count; i++) {
      this.spawn(x, y, color, speedMultiplier, scale);
    }
  }

  update(dt) {
    const dt60 = dt * 60;
    for (let i = 0; i < this.maxSparkles; i++) {
      const sp = this.sparkles[i];
      if (!sp.alive) continue;

      sp.x += sp.vx * dt60;
      sp.y += sp.vy * dt60;
      sp.vx *= 0.915;
      sp.vy *= 0.915;

      sp.twinklePhase += sp.twinkleSpeed * dt;
      sp.alpha -= sp.decay * dt60;

      if (sp.alpha <= 0) {
        sp.alpha = 0;
        sp.alive = false;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const count = this.maxSparkles;
    for (let i = 0; i < count; i++) {
      const sp = this.sparkles[i];
      if (!sp.alive || sp.alpha <= 0.02) continue;

      const twinkle = 0.75 + Math.sin(sp.twinklePhase) * 0.25;
      const alpha = sp.alpha * twinkle;

      ctx.globalAlpha = alpha;

      // 1. Glowing Laser Line
      const tailX = sp.x - sp.vx * sp.streakLength * 0.35;
      const tailY = sp.y - sp.vy * sp.streakLength * 0.35;

      ctx.strokeStyle = sp.color;
      ctx.lineWidth = Math.max(1, 2.0 * sp.scale);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();

      // 2. White-Hot Core Tip & Micro Cross-Glint
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.8, 1.0 * sp.scale);
      const size = Math.max(1.5, sp.glintSize);

      ctx.beginPath();
      ctx.moveTo(sp.x - size, sp.y);
      ctx.lineTo(sp.x + size, sp.y);
      ctx.moveTo(sp.x, sp.y - size);
      ctx.lineTo(sp.x, sp.y + size);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Explosion {
  constructor(x, y, particleType = null, config = { baseRadius: 65, baseDuration: 2.8 }, initialRotation = 0, isSeed = false, scale = 1.0, blastScale = 1.0, durationScale = 1.0) {
    this.x = x;
    this.y = y;
    this.particleType = particleType;
    this.isSeed = isSeed;
    this.scale = scale;
    this.blastScale = blastScale || 1.0;
    this.durationScale = durationScale || 1.0;
    
    if (particleType) {
      this.sides = particleType.sides || 6;
      this.isStar = !!particleType.isStar;
      this.isDart = !!particleType.isDart;
      this.color = particleType.color;
    } else {
      this.sides = 8;
      this.isStar = false;
      this.isDart = false;
      this.color = '#38bdf8';
    }

    const radiusMod = particleType ? (particleType.explosionRadiusMod || 1.0) : 1.0;
    const durationMod = particleType ? (particleType.explosionDurationMod || 1.0) : 1.0;

    const seedRadiusMultiplier = isSeed ? 1.35 : 1.0;
    const seedDurationMultiplier = isSeed ? 1.2 : 1.0;

    const baseR = (config && config.baseRadius) ? config.baseRadius : 65;
    const baseD = (config && config.baseDuration) ? config.baseDuration : 2.8;

    // Physical radius scaled to arena dimensions with custom blastScale
    this.maxRadius = baseR * radiusMod * seedRadiusMultiplier * scale * this.blastScale;
    this.duration = baseD * durationMod * seedDurationMultiplier * this.durationScale;
    this.isVortex = particleType ? !!particleType.isVortex : false;
    this.vortexForce = particleType ? (particleType.vortexForce || 240) * scale : 0;

    this.rotation = initialRotation;
    this.spin = (Math.random() - 0.5) * 0.6;

    this.elapsed = 0;
    this.currentRadius = 0;
    this.active = true;
    this.alive = true;
    this.alpha = 1.0;

    this.expandTime = this.duration * 0.25;
    this.sustainTime = this.duration * 0.35;
    this.decayTime = this.duration * 0.40;

    this.shockwaveRadius = 0;
    this.shockwaveMax = this.maxRadius * 1.35;
    this.shrapnelFired = false;
  }

  rescale(newArena, newScale, oldArena) {
    if (oldArena && oldArena.width > 0 && oldArena.height > 0) {
      const relX = (this.x - oldArena.x) / oldArena.width;
      const relY = (this.y - oldArena.y) / oldArena.height;
      this.x = newArena.x + relX * newArena.width;
      this.y = newArena.y + relY * newArena.height;
    }
    const ratio = newScale / (this.scale || 1.0);
    this.scale = newScale;
    this.maxRadius *= ratio;
    this.currentRadius *= ratio;
    this.shockwaveRadius *= ratio;
    this.shockwaveMax *= ratio;
  }

  update(dt, onShrapnelSpawn = null) {
    if (!this.alive) return;

    this.elapsed += dt;
    this.rotation += this.spin * dt;

    if (this.elapsed < this.expandTime) {
      const progress = this.elapsed / this.expandTime;
      const ease = 1 - Math.pow(1 - progress, 3);
      this.currentRadius = this.maxRadius * ease;
      this.alpha = 0.9 + 0.1 * progress;
      this.active = true;
    } else if (this.elapsed < this.expandTime + this.sustainTime) {
      this.currentRadius = this.maxRadius;
      this.alpha = 1.0;
      this.active = true;

      if (this.particleType && this.particleType.id === 'splitter' && !this.shrapnelFired) {
        this.shrapnelFired = true;
        if (onShrapnelSpawn) {
          onShrapnelSpawn(this.x, this.y);
        }
      }
    } else if (this.elapsed < this.duration) {
      const decayProgress = (this.elapsed - (this.expandTime + this.sustainTime)) / this.decayTime;
      this.currentRadius = this.maxRadius * (1 - decayProgress * 0.1);
      this.alpha = Math.max(0, 1.0 - decayProgress);
      this.active = decayProgress < 0.8;
    } else {
      this.active = false;
      this.alive = false;
    }

    const totalProgress = Math.min(1, this.elapsed / (this.duration * 0.65));
    this.shockwaveRadius = this.shockwaveMax * Math.pow(totalProgress, 0.7);
  }

  checkCollision(particle) {
    if (!this.active || !particle.alive || this.currentRadius <= 0) return false;

    const dx = particle.x - this.x;
    const dy = particle.y - this.y;
    const maxBound = this.currentRadius + particle.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq > maxBound * maxBound) return false;

    const dist = Math.sqrt(distSq);
    const N = this.sides;
    const inRadius = this.currentRadius * Math.cos(Math.PI / N);
    if (dist <= inRadius + particle.radius) return true;

    let angle = Math.atan2(dy, dx) - this.rotation;
    const sectorAngle = (2 * Math.PI) / N;
    angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const sectorRelAngle = (angle % sectorAngle) - (sectorAngle / 2);

    const projectedDist = dist * Math.cos(sectorRelAngle);
    return projectedDist <= inRadius + particle.radius;
  }

  draw(ctx) {
    if (!this.alive || this.currentRadius <= 0) return;

    ctx.save();
    
    // 1. Shockwave Vector Ring
    if (this.shockwaveRadius > 0 && this.alpha > 0.1) {
      const shockAlpha = Math.max(0, (1 - (this.shockwaveRadius / this.shockwaveMax)) * this.alpha * 0.35);
      ctx.globalAlpha = shockAlpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 1.5 * this.scale);
      this.renderPolygonPath(ctx, this.x, this.y, this.sides, this.shockwaveRadius, this.rotation * 1.25);
      ctx.stroke();
    }

    // 2. Outer Glow Stroke
    ctx.globalAlpha = this.alpha * 0.4;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(2, (this.isSeed ? 6.0 : 4.5) * this.scale);
    this.renderPolygonPath(ctx, this.x, this.y, this.sides, this.currentRadius, this.rotation);
    ctx.stroke();

    // 3. Crisp Inner Neon Stroke
    ctx.globalAlpha = this.alpha * 0.95;
    ctx.lineWidth = Math.max(1.2, (this.isSeed ? 2.4 : 1.8) * this.scale);
    ctx.stroke();

    // 4. White-Hot Accent Edge
    ctx.globalAlpha = this.alpha * 0.75;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(0.8, 1.0 * this.scale);
    this.renderPolygonPath(ctx, this.x, this.y, this.sides, this.currentRadius * 0.98, this.rotation);
    ctx.stroke();

    // Concentric echo polygon
    ctx.globalAlpha = this.alpha * 0.3;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.8, 1.2 * this.scale);
    this.renderPolygonPath(ctx, this.x, this.y, this.sides, this.currentRadius * 0.55, -this.rotation * 1.5);
    ctx.stroke();

    if (this.isVortex && this.active) {
      ctx.globalAlpha = this.alpha * 0.65;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 1.4 * this.scale);
      this.renderPolygonPath(ctx, this.x, this.y, 3, this.currentRadius * 0.35, this.rotation * 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderPolygonPath(ctx, cx, cy, sides, r, rot) {
    if (this.isStar) {
      this.renderStarPath(ctx, cx, cy, 4, r * 1.2, r * 0.42, rot);
      return;
    }

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * 2 * Math.PI / sides);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  renderStarPath(ctx, cx, cy, points, outerR, innerR, rot) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i * Math.PI / points);
      const r = (i % 2 === 0) ? outerR : innerR;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
