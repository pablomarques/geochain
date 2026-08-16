/**
 * High-Performance Geometry Wars Vector Particles
 * Resolution-Independent Physical Scaling (Zero Aspect-Ratio / Resizing Exploits)
 */

export const REFERENCE_ARENA = {
  width: 960,
  height: 600
};

export const PARTICLE_TYPES = {
  standard: {
    id: 'standard',
    name: 'Spark Triangle',
    sides: 3,
    color: '#38bdf8', // Neon Sky Cyan
    radius: 10.0,
    speedMultiplier: 1.0,
    explosionRadiusMod: 1.0,
    explosionDurationMod: 1.0,
    basePoints: 100,
    description: 'Equilateral triangle with balanced speed and triangular blast wave.'
  },
  mega: {
    id: 'mega',
    name: 'Heavy Diamond',
    sides: 4,
    color: '#fb923c', // Neon Amber
    radius: 13.0,
    speedMultiplier: 0.75,
    explosionRadiusMod: 1.65,
    explosionDurationMod: 1.2,
    basePoints: 250,
    description: 'Heavy concentric diamond triggering massive diamond blast field.'
  },
  splitter: {
    id: 'splitter',
    name: 'Nova Star',
    sides: 4,
    isStar: true,
    color: '#e879f9', // Neon Fuchsia
    radius: 10.5,
    speedMultiplier: 1.1,
    explosionRadiusMod: 0.95,
    explosionDurationMod: 0.95,
    basePoints: 200,
    description: '4-point star that unleashes 4 fast diamond shrapnel shards.'
  },
  vortex: {
    id: 'vortex',
    name: 'Hex Singularity',
    sides: 6,
    color: '#34d399', // Neon Emerald
    radius: 11.5,
    speedMultiplier: 0.9,
    explosionRadiusMod: 1.25,
    explosionDurationMod: 1.35,
    basePoints: 300,
    isVortex: true,
    vortexForce: 240,
    description: 'Hexagonal gravity well that pulls neighboring geometries inward.'
  },
  longburner: {
    id: 'longburner',
    name: 'Ember Pentagon',
    sides: 5,
    color: '#facc15', // Neon Gold
    radius: 10.5,
    speedMultiplier: 0.95,
    explosionRadiusMod: 0.9,
    explosionDurationMod: 2.8,
    basePoints: 200,
    description: 'Pentagonal ember blast that lingers 2.8x longer to bridge gaps.'
  },
  speedster: {
    id: 'speedster',
    name: 'Hyper Chevron',
    sides: 3,
    isDart: true,
    color: '#60a5fa', // Electric Blue
    radius: 9.5,
    speedMultiplier: 1.85,
    explosionRadiusMod: 1.0,
    explosionDurationMod: 0.85,
    basePoints: 250,
    description: 'High-speed delta dart bridging distant clusters.'
  },
  catalyst: {
    id: 'catalyst',
    name: 'Catalyst Octagon',
    sides: 8,
    color: '#ffffff', // Radiant White
    radius: 11.5,
    speedMultiplier: 1.15,
    explosionRadiusMod: 1.3,
    explosionDurationMod: 1.2,
    basePoints: 500,
    givesCharge: true,
    description: 'Rare faceted octagon that grants +1 extra trigger charge.'
  }
};

/**
 * Line segment collision and specular reflection
 */
export function checkSegmentCollision(x, y, vx, vy, radius, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) return null;

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  const distX = x - closestX;
  const distY = y - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < radius * radius && distSq > 0.000001) {
    const dist = Math.sqrt(distSq);
    const nx = distX / dist;
    const ny = distY / dist;

    const dot = vx * nx + vy * ny;
    if (dot < 0) { // Moving towards the wall
      const newVx = vx - 2 * dot * nx;
      const newVy = vy - 2 * dot * ny;
      const newX = closestX + nx * (radius + 0.5);
      const newY = closestY + ny * (radius + 0.5);
      return { x: newX, y: newY, vx: newVx, vy: newVy };
    }
  }
  return null;
}

/**
 * Render glowing barrier obstacle wall
 */
export function drawObstacleWall(ctx, x1, y1, x2, y2, scale = 1.0) {
  ctx.save();
  // Outer Neon Glow
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = Math.max(3, 7.0 * scale);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Core Solid Neon
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = Math.max(1.8, 3.0 * scale);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Bright White Inner Core Line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.8, 1.2 * scale);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // End Node Diamonds
  const nodeR = Math.max(2.5, 4.5 * scale);
  [ [x1, y1], [x2, y2] ].forEach(([nx, ny]) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.beginPath();
    ctx.moveTo(nx, ny - nodeR);
    ctx.lineTo(nx + nodeR, ny);
    ctx.lineTo(nx, ny + nodeR);
    ctx.lineTo(nx - nodeR, ny);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * Extract closed cycles (polygons/rooms) formed by connected wall segments
 */
export function extractPolygonsFromWalls(walls, arena, scale = 1.0) {
  if (!walls || walls.length < 3) return [];

  const vertices = [];
  const clusterDistSq = (10 * scale) * (10 * scale);

  function getOrAddVertex(px, py) {
    for (let i = 0; i < vertices.length; i++) {
      const dx = vertices[i].x - px;
      const dy = vertices[i].y - py;
      if (dx * dx + dy * dy <= clusterDistSq) {
        return i;
      }
    }
    vertices.push({ x: px, y: py });
    return vertices.length - 1;
  }

  const adj = [];
  walls.forEach(w => {
    const p1x = arena.x + w.x1 * arena.width;
    const p1y = arena.y + w.y1 * arena.height;
    const p2x = arena.x + w.x2 * arena.width;
    const p2y = arena.y + w.y2 * arena.height;

    const u = getOrAddVertex(p1x, p1y);
    const v = getOrAddVertex(p2x, p2y);

    if (u !== v) {
      while (adj.length <= Math.max(u, v)) adj.push([]);
      if (!adj[u].includes(v)) adj[u].push(v);
      if (!adj[v].includes(u)) adj[v].push(u);
    }
  });

  const polygons = [];
  const foundCycleKeys = new Set();

  function dfs(start, current, parent, path) {
    if (path.length > 20) return;

    const neighbors = adj[current] || [];
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (neighbor === parent) continue;

      if (neighbor === start && path.length >= 3) {
        // Canonicalize cycle for unique keying
        const cycle = [...path];
        const minIdx = cycle.indexOf(Math.min(...cycle));
        const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
        const key = rotated.join('-');

        if (!foundCycleKeys.has(key)) {
          foundCycleKeys.add(key);
          polygons.push(rotated.map(idx => vertices[idx]));
        }
        continue;
      }

      if (!path.includes(neighbor)) {
        dfs(start, neighbor, current, [...path, neighbor]);
      }
    }
  }

  for (let i = 0; i < vertices.length; i++) {
    if (adj[i] && adj[i].length >= 2) {
      dfs(i, i, -1, [i]);
    }
  }

  return polygons;
}

/**
 * Standard Jordan Curve Theorem Point-in-Polygon Test
 */
export function isPointInPolygon(px, py, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi || 0.000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Squared perpendicular distance from point to line segment
 */
export function distToSegmentSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) return (px - x1) * (px - x1) + (py - y1) * (py - y1);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ex = px - projX;
  const ey = py - projY;
  return ex * ex + ey * ey;
}

/**
 * Check if a candidate spawn position is valid and clear of all walls and closed shapes
 */
export function isValidSpawnPosition(px, py, radius, arena, walls, polygons = null, scale = 1.0) {
  const buffer = radius + 8 * scale;

  // 1. Boundary Clearance
  if (
    px < arena.x + buffer ||
    px > arena.x + arena.width - buffer ||
    py < arena.y + buffer ||
    py > arena.y + arena.height - buffer
  ) {
    return false;
  }

  // 2. Reject if inside ANY drawn closed shape / polygon
  const polys = polygons || extractPolygonsFromWalls(walls, arena, scale);
  for (let i = 0; i < polys.length; i++) {
    if (isPointInPolygon(px, py, polys[i])) {
      return false;
    }
  }

  // 3. Reject if too close to / intersecting ANY wall segment
  if (walls && walls.length > 0) {
    const minClearanceSq = buffer * buffer;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const wx1 = arena.x + w.x1 * arena.width;
      const wy1 = arena.y + w.y1 * arena.height;
      const wx2 = arena.x + w.x2 * arena.width;
      const wy2 = arena.y + w.y2 * arena.height;

      if (distToSegmentSq(px, py, wx1, wy1, wx2, wy2) < minClearanceSq) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Find safe spawn coordinates guaranteed outside drawn shapes and away from walls
 */
export function findSafeSpawnPosition(arena, walls, radius, scale = 1.0, rng = Math.random, maxAttempts = 350) {
  const polygons = extractPolygonsFromWalls(walls, arena, scale);
  const margin = Math.max(radius + 10 * scale, 24 * scale);

  let bestCandidate = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const px = arena.x + margin + rng() * (arena.width - margin * 2);
    const py = arena.y + margin + rng() * (arena.height - margin * 2);

    if (isValidSpawnPosition(px, py, radius, arena, walls, polygons, scale)) {
      return { x: px, y: py };
    }

    // Score fallback candidate based on clearance from walls
    let minDistSq = Infinity;
    if (walls && walls.length > 0) {
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const wx1 = arena.x + w.x1 * arena.width;
        const wy1 = arena.y + w.y1 * arena.height;
        const wx2 = arena.x + w.x2 * arena.width;
        const wy2 = arena.y + w.y2 * arena.height;
        const dSq = distToSegmentSq(px, py, wx1, wy1, wx2, wy2);
        if (dSq < minDistSq) minDistSq = dSq;
      }
    } else {
      minDistSq = 1000;
    }

    // Penalize if inside polygon
    let insidePoly = false;
    for (let i = 0; i < polygons.length; i++) {
      if (isPointInPolygon(px, py, polygons[i])) {
        insidePoly = true;
        break;
      }
    }

    const score = insidePoly ? -10000 + minDistSq : minDistSq;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { x: px, y: py };
    }
  }

  return bestCandidate || {
    x: arena.x + arena.width / 2,
    y: arena.y + arena.height / 2
  };
}

export class Particle {
  constructor(x, y, typeId = 'standard', baseSpeed = 2.4, arena = { x: 0, y: 0, width: 960, height: 600 }, scale = 1.0, bodyScale = 1.0, speedScale = 1.0, blastScale = 1.0, durationScale = 1.0, globalBodyScale = 1.0) {
    this.x = x;
    this.y = y;
    this.type = PARTICLE_TYPES[typeId] || PARTICLE_TYPES.standard;
    this.arena = arena;
    this.scale = scale;
    this.bodyScale = bodyScale || 1.0;
    this.speedScale = speedScale || 1.0;
    this.blastScale = blastScale || 1.0;
    this.durationScale = durationScale || 1.0;
    this.globalBodyScale = globalBodyScale || 1.0;

    // Physical radius scaled proportionally to global body multiplier, individual shape multiplier, and arena scale
    this.radius = this.type.radius * this.globalBodyScale * this.bodyScale * scale;

    // Base speed scaled proportionally to preserve traversal time
    this.baseSpeed = baseSpeed;
    const angle = Math.random() * Math.PI * 2;
    this.speed = baseSpeed * this.type.speedMultiplier * this.speedScale * scale;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.rotation = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 2.2;

    this.alive = true;

    // Fixed Ring-Buffer for Trails
    this.maxTrail = 4;
    this.trailX = new Float32Array(this.maxTrail);
    this.trailY = new Float32Array(this.maxTrail);
    this.trailRot = new Float32Array(this.maxTrail);
    this.trailHead = 0;
    this.trailFilled = 0;
  }

  // Smoothly reposition and rescale physics on window resize or dynamic calibration adjustments
  rescale(newArena, newScale, oldArena, bodyScale = null, speedScale = null, blastScale = null, durationScale = null, globalBodyScale = null, baseSpeed = null) {
    if (bodyScale !== null) {
      this.bodyScale = bodyScale;
    }
    if (speedScale !== null) {
      this.speedScale = speedScale;
    }
    if (blastScale !== null) {
      this.blastScale = blastScale;
    }
    if (durationScale !== null) {
      this.durationScale = durationScale;
    }
    if (globalBodyScale !== null) {
      this.globalBodyScale = globalBodyScale;
    }
    if (baseSpeed !== null) {
      this.baseSpeed = baseSpeed;
    }

    if (oldArena && oldArena.width > 0 && oldArena.height > 0) {
      const relX = (this.x - oldArena.x) / oldArena.width;
      const relY = (this.y - oldArena.y) / oldArena.height;
      this.x = newArena.x + relX * newArena.width;
      this.y = newArena.y + relY * newArena.height;
    }

    this.arena = newArena;
    this.scale = newScale;
    this.radius = this.type.radius * this.globalBodyScale * this.bodyScale * newScale;

    // Recalculate target speed and update velocity vectors preserving current heading
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 0.001;
    const targetSpeed = this.baseSpeed * this.type.speedMultiplier * this.speedScale * newScale;
    this.speed = targetSpeed;
    this.vx = (this.vx / currentSpeed) * targetSpeed;
    this.vy = (this.vy / currentSpeed) * targetSpeed;
  }

  update(dt, speedMultiplier = 1.0, walls = []) {
    if (!this.alive) return;

    // Update Ring Buffer
    this.trailX[this.trailHead] = this.x;
    this.trailY[this.trailHead] = this.y;
    this.trailRot[this.trailHead] = this.rotation;
    this.trailHead = (this.trailHead + 1) % this.maxTrail;
    if (this.trailFilled < this.maxTrail) this.trailFilled++;

    if (this.type.isDart) {
      this.rotation = Math.atan2(this.vy, this.vx);
    } else {
      this.rotation += this.angularVelocity * (dt * 60) * 0.03;
    }

    this.x += this.vx * speedMultiplier * (dt * 60);
    this.y += this.vy * speedMultiplier * (dt * 60);

    // 1. Arena Outer Boundary Reflections
    const r = this.radius;
    const minX = this.arena.x + r;
    const maxX = this.arena.x + this.arena.width - r;
    const minY = this.arena.y + r;
    const maxY = this.arena.y + this.arena.height - r;

    if (this.x <= minX) {
      this.x = minX;
      this.vx = Math.abs(this.vx);
    } else if (this.x >= maxX) {
      this.x = maxX;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y <= minY) {
      this.y = minY;
      this.vy = Math.abs(this.vy);
    } else if (this.y >= maxY) {
      this.y = maxY;
      this.vy = -Math.abs(this.vy);
    }

    // 2. Obstacle Barrier Wall Collisions
    if (walls && walls.length > 0) {
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const x1 = this.arena.x + w.x1 * this.arena.width;
        const y1 = this.arena.y + w.y1 * this.arena.height;
        const x2 = this.arena.x + w.x2 * this.arena.width;
        const y2 = this.arena.y + w.y2 * this.arena.height;

        const col = checkSegmentCollision(this.x, this.y, this.vx, this.vy, this.radius, x1, y1, x2, y2);
        if (col) {
          this.x = col.x;
          this.y = col.y;
          this.vx = col.vx;
          this.vy = col.vy;
        }
      }
    }
  }

  applyForce(targetX, targetY, strength, dt) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distSq = dx * dx + dy * dy;
    const maxPullSq = (340 * this.scale) * (340 * this.scale);
    const minPullSq = (5 * this.scale) * (5 * this.scale);

    if (distSq > minPullSq && distSq < maxPullSq) {
      const dist = Math.sqrt(distSq);
      const scaledStrength = strength * this.scale;
      const force = (scaledStrength / (dist + 35 * this.scale)) * dt * 2.6;
      this.vx += (dx / dist) * force;
      this.vy += (dy / dist) * force;
      this.vx *= 0.985;
      this.vy *= 0.985;
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    // 1. Vector Motion Trail
    if (this.trailFilled > 1) {
      ctx.save();
      ctx.strokeStyle = this.type.color;
      ctx.lineWidth = Math.max(1, 1 * this.scale);

      for (let i = 0; i < this.trailFilled; i++) {
        const idx = (this.trailHead - this.trailFilled + i + this.maxTrail) % this.maxTrail;
        const alpha = (i / this.trailFilled) * 0.22;
        ctx.globalAlpha = alpha;
        this.renderShapePath(ctx, this.trailX[idx], this.trailY[idx], this.radius * 0.8, this.trailRot[idx]);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();

    // 2. High-Speed Layered Neon Glow
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = this.type.color;
    ctx.lineWidth = Math.max(2, 5.0 * this.scale);
    this.renderShapePath(ctx, this.x, this.y, this.radius, this.rotation);
    ctx.stroke();

    // Sharp Neon Perimeter
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(1.2, 2.2 * this.scale);
    ctx.stroke();

    // Inner White Core Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(0.8, 1.0 * this.scale);
    ctx.globalAlpha = 0.85;
    this.renderShapePath(ctx, this.x, this.y, this.radius * 0.96, this.rotation);
    ctx.stroke();

    // 3. Inner Wireframe Accents
    ctx.strokeStyle = this.type.color;
    ctx.lineWidth = Math.max(1, 1.2 * this.scale);

    if (this.type.id === 'standard') {
      for (let i = 0; i < 3; i++) {
        const a = this.rotation + (i * 2 * Math.PI / 3);
        const vx = this.x + Math.cos(a) * this.radius;
        const vy = this.y + Math.sin(a) * this.radius;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(vx, vy, Math.max(1, 1.5 * this.scale), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.type.id === 'mega') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      this.renderRegularPolygon(ctx, this.x, this.y, 4, this.radius * 0.5, this.rotation);
      ctx.stroke();
    } else if (this.type.id === 'splitter') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      this.renderRegularPolygon(ctx, this.x, this.y, 4, this.radius * 0.4, this.rotation + Math.PI / 4);
      ctx.stroke();
    } else if (this.type.id === 'vortex') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      this.renderRegularPolygon(ctx, this.x, this.y, 3, this.radius * 0.5, -this.rotation * 2);
      ctx.stroke();
    } else if (this.type.id === 'longburner') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      this.renderStar(ctx, this.x, this.y, 5, this.radius * 0.55, this.radius * 0.25, this.rotation);
      ctx.stroke();
    } else if (this.type.id === 'catalyst') {
      ctx.strokeStyle = '#fef08a';
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(this.x - this.radius * 0.5, this.y);
      ctx.lineTo(this.x + this.radius * 0.5, this.y);
      ctx.moveTo(this.x, this.y - this.radius * 0.5);
      ctx.lineTo(this.x, this.y + this.radius * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderShapePath(ctx, cx, cy, r, rot) {
    if (this.type.isStar) {
      this.renderStar(ctx, cx, cy, 4, r * 1.25, r * 0.42, rot);
    } else if (this.type.isDart) {
      this.renderChevron(ctx, cx, cy, r * 1.35, rot);
    } else {
      this.renderRegularPolygon(ctx, cx, cy, this.type.sides, r, rot);
    }
  }

  renderRegularPolygon(ctx, cx, cy, sides, radius, rotation) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * 2 * Math.PI / sides);
      const px = cx + Math.cos(a) * radius;
      const py = cy + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  renderStar(ctx, cx, cy, points, outerR, innerR, rotation) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rotation + (i * Math.PI / points);
      const r = (i % 2 === 0) ? outerR : innerR;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  renderChevron(ctx, cx, cy, length, rotation) {
    ctx.beginPath();
    const tipX = cx + Math.cos(rotation) * length;
    const tipY = cy + Math.sin(rotation) * length;
    const leftX = cx + Math.cos(rotation + 2.5) * length;
    const leftY = cy + Math.sin(rotation + 2.5) * length;
    const rightX = cx + Math.cos(rotation - 2.5) * length;
    const rightY = cy + Math.sin(rotation - 2.5) * length;
    const innerX = cx - Math.cos(rotation) * (length * 0.35);
    const innerY = cy - Math.sin(rotation) * (length * 0.35);

    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(innerX, innerY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
  }
}

export class Shrapnel {
  constructor(x, y, angle, baseSpeed = 8.5, arena = { x: 0, y: 0, width: 960, height: 600 }, scale = 1.0) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.speed = baseSpeed * scale;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.radius = 5.0 * scale;
    this.rotation = angle;
    this.life = 0;
    this.maxLife = 1.4;
    this.alive = true;
    this.arena = arena;
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
    this.radius = 5.0 * newScale;
    this.vx *= ratio;
    this.vy *= ratio;
    this.arena = newArena;
  }

  update(dt, walls = []) {
    if (!this.alive) return;
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.alive = false;
      return;
    }

    this.x += this.vx * (dt * 60);
    this.y += this.vy * (dt * 60);
    this.rotation += 0.18;

    const minX = this.arena.x;
    const maxX = this.arena.x + this.arena.width;
    const minY = this.arena.y;
    const maxY = this.arena.y + this.arena.height;

    if (this.x <= minX || this.x >= maxX) {
      this.vx = -this.vx;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    }
    if (this.y <= minY || this.y >= maxY) {
      this.vy = -this.vy;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }

    // Obstacle Wall collisions for shrapnel
    if (walls && walls.length > 0) {
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const x1 = this.arena.x + w.x1 * this.arena.width;
        const y1 = this.arena.y + w.y1 * this.arena.height;
        const x2 = this.arena.x + w.x2 * this.arena.width;
        const y2 = this.arena.y + w.y2 * this.arena.height;

        const col = checkSegmentCollision(this.x, this.y, this.vx, this.vy, this.radius, x1, y1, x2, y2);
        if (col) {
          this.x = col.x;
          this.y = col.y;
          this.vx = col.vx;
          this.vy = col.vy;
        }
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    
    // Laser Trail
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.6)';
    ctx.lineWidth = Math.max(1, 2 * this.scale);
    ctx.beginPath();
    ctx.moveTo(this.x - this.vx * 3.5, this.y - this.vy * 3.5);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Hollow Diamond Shard Head
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 1.8 * this.scale);

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = this.rotation + (i * Math.PI / 2);
      const r = (i % 2 === 0) ? this.radius * 1.3 : this.radius * 0.65;
      const px = this.x + Math.cos(a) * r;
      const py = this.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}
