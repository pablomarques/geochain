/**
 * Geometry Wars Elastic Spacetime Grid Engine
 * High-performance 2D spring-mass lattice with radial blast distortion,
 * gravitational singularity warping, and stress-adaptive neon vector glow.
 */

export class ElasticSpacetimeGrid {
  constructor(arena, spacing = 30) {
    this.spacing = spacing;
    this.arena = arena;
    this.cols = 0;
    this.rows = 0;
    this.nodes = [];
    this.springK = 0.055;     // Elastic return stiffness
    this.damping = 0.90;      // Velocity damping factor
    this.neighborK = 0.045;   // Neighbor spring tension (fluid ripple propagation)

    this.rebuild(arena);
  }

  rebuild(arena) {
    this.arena = arena;
    this.cols = Math.ceil(arena.width / this.spacing) + 1;
    this.rows = Math.ceil(arena.height / this.spacing) + 1;

    const total = this.cols * this.rows;
    this.nodes = new Array(total);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const baseX = arena.x + c * this.spacing;
        const baseY = arena.y + r * this.spacing;
        
        // Edge nodes are fixed anchors
        const isPinned = (c === 0 || c === this.cols - 1 || r === 0 || r === this.rows - 1);

        this.nodes[idx] = {
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          isPinned
        };
      }
    }
  }

  resize(arena) {
    this.rebuild(arena);
  }

  // 50% larger affected radius for wide spacetime ripple propagation
  applyExplosionImpulse(x, y, radius, force = 45, isPull = false) {
    const influenceRadius = Math.max(radius * 2.4, 115); // +50% larger affected zone
    const radSq = influenceRadius * influenceRadius;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.isPinned) continue;

      const dx = node.x - x;
      const dy = node.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < radSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const factor = 1 - (dist / influenceRadius);
        const smoothFalloff = factor * factor * (3 - 2 * factor); // Smoothstep curve
        const mag = (force * smoothFalloff) / (dist + 24);

        const dirX = dx / dist;
        const dirY = dy / dist;

        if (isPull) {
          // Gravitational Singularity (pull inward)
          node.vx -= dirX * mag * 2.4;
          node.vy -= dirY * mag * 2.4;
        } else {
          // Kinetic Blast Wave (push outward)
          node.vx += dirX * mag * 2.6;
          node.vy += dirY * mag * 2.6;
        }
      }
    }
  }

  update(dt) {
    const dt60 = dt * 60;
    const cols = this.cols;
    const rows = this.rows;

    // 1. Hooke's Law: Elastic return to base resting coordinate
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.isPinned) continue;

      const fx = (n.baseX - n.x) * this.springK;
      const fy = (n.baseY - n.y) * this.springK;

      n.vx = (n.vx + fx * dt60) * this.damping;
      n.vy = (n.vy + fy * dt60) * this.damping;

      n.x += n.vx * dt60;
      n.y += n.vy * dt60;
    }

    // 2. Neighbor Spring Coupling (fluid wave ripple across entire grid)
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const idx = r * cols + c;
        const node = this.nodes[idx];

        const left = this.nodes[idx - 1];
        const right = this.nodes[idx + 1];
        const top = this.nodes[idx - cols];
        const bottom = this.nodes[idx + cols];

        const avgX = (left.x + right.x + top.x + bottom.x) * 0.25;
        const avgY = (left.y + right.y + top.y + bottom.y) * 0.25;

        node.vx += (avgX - node.x) * this.neighborK * dt60;
        node.vy += (avgY - node.y) * this.neighborK * dt60;
      }
    }
  }

  draw(ctx) {
    const cols = this.cols;
    const rows = this.rows;
    if (cols < 2 || rows < 2) return;

    ctx.save();

    // Clip rendering strictly within arena
    ctx.beginPath();
    ctx.rect(this.arena.x, this.arena.y, this.arena.width, this.arena.height);
    ctx.clip();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1.0;

    // 1. Horizontal Elastic Grid Lines
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      const rowOffset = r * cols;
      ctx.moveTo(this.nodes[rowOffset].x, this.nodes[rowOffset].y);
      for (let c = 1; c < cols; c++) {
        const n = this.nodes[rowOffset + c];
        ctx.lineTo(n.x, n.y);
      }
    }
    ctx.stroke();

    // 2. Vertical Elastic Grid Lines
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      ctx.moveTo(this.nodes[c].x, this.nodes[c].y);
      for (let r = 1; r < rows; r++) {
        const n = this.nodes[r * cols + c];
        ctx.lineTo(n.x, n.y);
      }
    }
    ctx.stroke();

    // 3. Spacetime Stress Accent Glints
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.isPinned) continue;

      const dx = n.x - n.baseX;
      const dy = n.y - n.baseY;
      const distSq = dx * dx + dy * dy;

      if (distSq > 25) {
        const stress = Math.min(1, Math.sqrt(distSq) / 25);
        ctx.globalAlpha = stress * 0.75;
        ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
      }
    }

    ctx.restore();
  }
}
