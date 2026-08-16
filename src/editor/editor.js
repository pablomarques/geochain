import { Particle, Shrapnel, PARTICLE_TYPES, REFERENCE_ARENA, drawObstacleWall, checkSegmentCollision } from '../particles.js';
import { Explosion, SparklePool } from '../explosion.js';
import { ElasticSpacetimeGrid } from '../grid.js';
import { CAMPAIGNS, resolveLevelConfig } from '../levels.js';
import { soundEngine } from '../audio.js';
import { FloatingText } from '../game.js';

// DOM Selectors
const canvas = document.getElementById('studio-canvas');
const viewportWrapper = document.getElementById('viewport-frame-wrapper');
const resolutionLabel = document.getElementById('viewport-resolution-label');
const clickPrompt = document.getElementById('studio-click-prompt');

// Header Viewport Switcher
const formatBtns = document.querySelectorAll('.format-pill-btn');

// Campaign Select & Meta
const selectActiveCampaign = document.getElementById('select-active-campaign');
const inputCampaignTitle = document.getElementById('input-campaign-title');
const inputCampaignTagline = document.getElementById('input-campaign-tagline');
const inputCampaignBadge = document.getElementById('input-campaign-badge');
const inputCampaignColor = document.getElementById('input-campaign-color');
const btnNewCampaign = document.getElementById('btn-new-campaign');

// Level Sequence List
const levelsSequenceList = document.getElementById('levels-sequence-list');
const levelListCount = document.getElementById('level-list-count');
const btnAddLevel = document.getElementById('btn-add-level');
const btnDuplicateLevel = document.getElementById('btn-duplicate-level');
const btnDeleteLevel = document.getElementById('btn-delete-level');

// Level Inspector Inputs
const inputLevelNum = document.getElementById('input-level-num');
const inputLevelTitle = document.getElementById('input-level-title');
const inputLevelTip = document.getElementById('input-level-tip');
const totalParticlesBadge = document.getElementById('total-particles-badge');

// Platform Spec Switcher (Desktop vs Mobile Version)
const btnTargetDesktop = document.getElementById('btn-target-desktop');
const btnTargetMobile = document.getElementById('btn-target-mobile');
const btnSyncFormats = document.getElementById('btn-sync-formats');

// Per-Body Entity Sliders & Counter Labels
const entityTypes = ['standard', 'mega', 'splitter', 'vortex', 'longburner', 'speedster', 'catalyst'];
const entitySliders = {};
const entitySizeSliders = {};
const entitySpeedSliders = {};
const entityBlastSliders = {};
const entityDurationSliders = {};

const entityValueLabels = {};
const entitySizeLabels = {};
const entitySpeedLabels = {};
const entityBlastLabels = {};
const entityDurationLabels = {};

entityTypes.forEach(type => {
  entitySliders[type] = document.getElementById(`slider-ent-${type}`);
  entitySizeSliders[type] = document.getElementById(`slider-size-${type}`);
  entitySpeedSliders[type] = document.getElementById(`slider-speed-${type}`);
  entityBlastSliders[type] = document.getElementById(`slider-blast-${type}`);
  entityDurationSliders[type] = document.getElementById(`slider-duration-${type}`);

  entityValueLabels[type] = document.getElementById(`val-ent-${type}`);
  entitySizeLabels[type] = document.getElementById(`val-size-${type}`);
  entitySpeedLabels[type] = document.getElementById(`val-speed-${type}`);
  entityBlastLabels[type] = document.getElementById(`val-blast-${type}`);
  entityDurationLabels[type] = document.getElementById(`val-duration-${type}`);
});

// Physics, Size, Explosion Radii, Durations & Star Targets
const sliderBaseSpeed = document.getElementById('slider-base-speed');
const labelSpeedTier = document.getElementById('label-speed-tier');
const sliderBodyScale = document.getElementById('slider-body-scale');
const labelBodyScale = document.getElementById('label-body-scale');

const sliderSparkBlast = document.getElementById('slider-spark-blast');
const labelSparkBlast = document.getElementById('label-spark-blast');
const sliderSparkDuration = document.getElementById('slider-spark-duration');
const labelSparkDuration = document.getElementById('label-spark-duration');

const sliderChainBlast = document.getElementById('slider-chain-blast');
const labelChainBlast = document.getElementById('label-chain-blast');
const sliderChainDuration = document.getElementById('slider-chain-duration');
const labelChainDuration = document.getElementById('label-chain-duration');

const chargeBtns = document.querySelectorAll('.charge-btn');
const inputQuotaTarget = document.getElementById('input-quota-target');
const inputQuotaStar2 = document.getElementById('input-quota-star2');
const inputQuotaStar3 = document.getElementById('input-quota-star3');
const inputParTime = document.getElementById('input-par-time');
const btnAutocalcQuotas = document.getElementById('btn-autocalc-quotas');

// Simulation Controls, Tools & Telemetry
const btnSimReset = document.getElementById('btn-sim-reset');
const btnLockSeed = document.getElementById('btn-lock-seed');
const speedBtns = document.querySelectorAll('.sim-speed-btn');
const toolPillBtns = document.querySelectorAll('.tool-pill-btn');
const btnSnapGrid = document.getElementById('btn-snap-grid');
const btnClearWalls = document.getElementById('btn-clear-walls');
const wallCountBadge = document.getElementById('wall-count-badge');

const telPopped = document.getElementById('tel-popped');
const telCombo = document.getElementById('tel-combo');
const telTime = document.getElementById('tel-time');
const telSparks = document.getElementById('tel-sparks');
const telStars = document.getElementById('tel-stars');

// JSON Sync Modal Elements
const btnCopyLevelJson = document.getElementById('btn-copy-level-json');
const btnExportCampaignJson = document.getElementById('btn-export-campaign-json');
const btnImportJson = document.getElementById('btn-import-json');
const btnSaveDraft = document.getElementById('btn-save-draft');

const modalJsonSync = document.getElementById('modal-json-sync');
const jsonModalTitle = document.getElementById('json-modal-title');
const jsonModalDesc = document.getElementById('json-modal-desc');
const jsonSyncTextarea = document.getElementById('json-sync-textarea');
const btnCopyTextarea = document.getElementById('btn-copy-textarea');
const btnApplyJsonImport = document.getElementById('btn-apply-json-import');
const btnCloseJsonModal = document.getElementById('btn-close-json-modal');

// Studio State Controller
class StudioController {
  constructor() {
    this.campaigns = this.loadWorkingCampaigns();
    this.activeCampaignIndex = 0;
    this.activeLevelIndex = 0;
    this.editingFormat = 'desktop'; // 'desktop' or 'mobile'
    this.viewportFormat = 'desktop-16-10'; // 'desktop-16-10', 'desktop-16-9', 'mobile-portrait'
    this.simSpeed = 1.0;
    this.isSeedLocked = false;
    this.lockedSeed = Math.random();

    // Tool Modes: 'spark', 'wall', 'erase'
    this.activeTool = 'spark';
    this.snapGrid = true;
    this.isDrawingWall = false;
    this.wallStartPos = null;
    this.wallCurrentPos = null;
    this.hoverCursorPos = null;

    // Simulation Physics State
    this.ctx = canvas.getContext('2d');
    this.arena = { x: 0, y: 0, width: 960, height: 600 };
    this.scale = 1.0;
    this.grid = new ElasticSpacetimeGrid(this.arena, 30, this.scale);
    this.sparklePool = new SparklePool(450);

    this.particles = [];
    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.ambientMotes = [];

    this.explodedCount = 0;
    this.comboChain = 0;
    this.highestCombo = 0;
    this.charges = 1;
    this.elapsedTime = 0;
    this.simState = 'ready';

    this.lastFrameTime = performance.now();

    this.init();
  }

  loadWorkingCampaigns() {
    try {
      const draft = localStorage.getItem('cr_studio_draft_campaigns');
      if (draft) return JSON.parse(draft);
    } catch (e) {
      console.warn('Studio draft load fallback:', e);
    }
    return JSON.parse(JSON.stringify(CAMPAIGNS));
  }

  saveDraft() {
    try {
      localStorage.setItem('cr_studio_draft_campaigns', JSON.stringify(this.campaigns));
      this.showToast('Draft saved to local storage!');
    } catch (e) {
      console.error(e);
    }
  }

  get activeCampaign() {
    return this.campaigns[this.activeCampaignIndex] || this.campaigns[0];
  }

  get activeLevel() {
    const levels = this.activeCampaign.levels;
    const lvl = levels[this.activeLevelIndex] || levels[0];
    
    // Ensure dual formats structure exists
    if (!lvl.formats) {
      lvl.formats = {
        desktop: {
          target: lvl.target || 1,
          stars: lvl.stars || [1, 3, 5],
          totalParticles: lvl.totalParticles || 8,
          baseSpeed: lvl.baseSpeed || 2.4,
          speedLabel: lvl.speedLabel || 'Normal',
          bodySizeScale: lvl.bodySizeScale || 1.0,
          sparkBlastScale: lvl.sparkBlastScale || 1.0,
          chainBlastScale: lvl.chainBlastScale || 1.0,
          sparkDurationScale: lvl.sparkDurationScale || 1.0,
          chainDurationScale: lvl.chainDurationScale || 1.0,
          parTime: lvl.parTime || 5.0,
          charges: lvl.charges || 1,
          distribution: lvl.distribution || { standard: 8 },
          bodies: {},
          walls: lvl.walls || []
        },
        mobile: {
          target: Math.max(1, Math.round((lvl.target || 1) * 0.7)),
          stars: [Math.max(1, Math.round((lvl.target || 1) * 0.7)), Math.max(2, Math.round((lvl.totalParticles || 8) * 0.4)), Math.max(3, Math.round((lvl.totalParticles || 8) * 0.6))],
          totalParticles: Math.max(4, Math.round((lvl.totalParticles || 8) * 0.7)),
          baseSpeed: +(Math.max(1.0, (lvl.baseSpeed || 2.4) * 0.9)).toFixed(1),
          speedLabel: lvl.speedLabel || 'Normal',
          bodySizeScale: +(Math.min(2.5, (lvl.bodySizeScale || 1.0) * 1.15)).toFixed(2),
          sparkBlastScale: lvl.sparkBlastScale || 1.0,
          chainBlastScale: lvl.chainBlastScale || 1.0,
          sparkDurationScale: lvl.sparkDurationScale || 1.0,
          chainDurationScale: lvl.chainDurationScale || 1.0,
          parTime: lvl.parTime || 5.0,
          charges: lvl.charges || 1,
          distribution: { standard: Math.max(4, Math.round((lvl.totalParticles || 8) * 0.7)) },
          bodies: {},
          walls: lvl.walls ? JSON.parse(JSON.stringify(lvl.walls)) : []
        }
      };
    }
    if (!lvl.formats.desktop) lvl.formats.desktop = { ...lvl.formats.mobile };
    if (!lvl.formats.mobile) lvl.formats.mobile = { ...lvl.formats.desktop };

    return lvl;
  }

  get activeFormatSpec() {
    const spec = this.activeLevel.formats[this.editingFormat];
    if (!spec.bodies) spec.bodies = {};
    if (spec.sparkBlastScale === undefined) spec.sparkBlastScale = 1.0;
    if (spec.chainBlastScale === undefined) spec.chainBlastScale = 1.0;
    if (spec.sparkDurationScale === undefined) spec.sparkDurationScale = 1.0;
    if (spec.chainDurationScale === undefined) spec.chainDurationScale = 1.0;

    const defaultSize = spec.bodySizeScale || (this.editingFormat === 'mobile' ? 1.15 : 1.0);
    
    entityTypes.forEach(type => {
      if (!spec.bodies[type]) {
        const count = (spec.distribution && spec.distribution[type]) || 0;
        spec.bodies[type] = {
          count,
          size: defaultSize,
          speed: 1.0,
          blast: 1.0,
          duration: 1.0
        };
      } else {
        if (spec.bodies[type].blast === undefined) spec.bodies[type].blast = 1.0;
        if (spec.bodies[type].duration === undefined) spec.bodies[type].duration = 1.0;
      }
    });

    return spec;
  }

  init() {
    this.populateCampaignSelect();
    this.bindCampaignMeta();
    this.renderLevelSequenceList();
    this.loadLevelToInspector();
    this.applyViewportFormat(this.viewportFormat);
    this.setupEventListeners();
    this.respawnSimulation();

    requestAnimationFrame(this.renderLoop.bind(this));
  }

  populateCampaignSelect() {
    selectActiveCampaign.innerHTML = '';
    this.campaigns.forEach((camp, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${camp.badge || '🌌'} ${camp.title} (${camp.levels.length} Stages)`;
      if (idx === this.activeCampaignIndex) opt.selected = true;
      selectActiveCampaign.appendChild(opt);
    });
  }

  bindCampaignMeta() {
    const camp = this.activeCampaign;
    inputCampaignTitle.value = camp.title;
    inputCampaignTagline.value = camp.tagline || '';
    inputCampaignBadge.value = camp.badge || '🌌';
    inputCampaignColor.value = camp.color || '#38bdf8';
  }

  renderLevelSequenceList() {
    const levels = this.activeCampaign.levels;
    levelListCount.textContent = levels.length;
    levelsSequenceList.innerHTML = '';

    levels.forEach((lvl, idx) => {
      const card = document.createElement('div');
      card.className = `level-item-card ${idx === this.activeLevelIndex ? 'active' : ''}`;

      const spec = (lvl.formats && lvl.formats[this.editingFormat]) || lvl;
      const wallCount = (spec.walls && spec.walls.length) ? ` • 🧱 ${spec.walls.length}` : '';
      const sizeTag = spec.bodySizeScale && spec.bodySizeScale !== 1.0 ? ` • ${spec.bodySizeScale}x` : '';

      card.innerHTML = `
        <div class="level-item-left">
          <span class="level-badge-num">${lvl.level || (idx + 1)}</span>
          <div class="level-item-info">
            <span class="level-item-title">${lvl.title || `Stage ${idx + 1}`}</span>
            <span class="level-item-sub">${spec.totalParticles || 0} Bodies • ${spec.speedLabel || 'Normal'}${wallCount}${sizeTag}</span>
          </div>
        </div>
        <div class="level-reorder-btns">
          <button class="reorder-btn btn-move-up" data-idx="${idx}" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="reorder-btn btn-move-down" data-idx="${idx}" title="Move Down" ${idx === levels.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('reorder-btn')) return;
        this.selectLevel(idx);
      });

      const btnUp = card.querySelector('.btn-move-up');
      const btnDown = card.querySelector('.btn-move-down');

      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveLevel(idx, -1);
      });

      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveLevel(idx, 1);
      });

      levelsSequenceList.appendChild(card);
    });
  }

  selectLevel(idx) {
    this.activeLevelIndex = Math.max(0, Math.min(idx, this.activeCampaign.levels.length - 1));
    this.renderLevelSequenceList();
    this.loadLevelToInspector();
    this.respawnSimulation();
  }

  moveLevel(idx, direction) {
    const levels = this.activeCampaign.levels;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= levels.length) return;

    const [moved] = levels.splice(idx, 1);
    levels.splice(targetIdx, 0, moved);

    levels.forEach((lvl, i) => { lvl.level = i + 1; });

    this.activeLevelIndex = targetIdx;
    this.renderLevelSequenceList();
    this.loadLevelToInspector();
    this.respawnSimulation();
  }

  addNewLevel() {
    const levels = this.activeCampaign.levels;
    const newStageNum = levels.length + 1;
    const newLvl = {
      level: newStageNum,
      title: `Stage ${newStageNum}`,
      tip: 'New stage authored in GeoChain Studio.',
      formats: {
        desktop: {
          target: Math.max(1, Math.round(newStageNum * 3.5)),
          stars: [Math.max(1, Math.round(newStageNum * 3.5)), Math.max(3, Math.round(newStageNum * 5.0)), Math.max(5, Math.round(newStageNum * 6.5))],
          totalParticles: Math.min(80, 10 + newStageNum * 5),
          baseSpeed: Math.max(1.1, +(4.6 - (newStageNum - 1) * 0.3).toFixed(1)),
          speedLabel: this.getSpeedLabel(Math.max(1.1, 4.6 - (newStageNum - 1) * 0.3)),
          bodySizeScale: 1.0,
          sparkBlastScale: 1.0,
          chainBlastScale: 1.0,
          sparkDurationScale: 1.0,
          chainDurationScale: 1.0,
          parTime: +(4.5 + newStageNum * 0.5).toFixed(1),
          charges: newStageNum > 9 ? 2 : 1,
          distribution: { standard: Math.min(80, 10 + newStageNum * 5) },
          bodies: { standard: { count: Math.min(80, 10 + newStageNum * 5), size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 } },
          walls: []
        },
        mobile: {
          target: Math.max(1, Math.round(newStageNum * 2.5)),
          stars: [Math.max(1, Math.round(newStageNum * 2.5)), Math.max(2, Math.round(newStageNum * 3.8)), Math.max(4, Math.round(newStageNum * 5.0))],
          totalParticles: Math.min(55, 8 + newStageNum * 4),
          baseSpeed: Math.max(1.1, +(4.0 - (newStageNum - 1) * 0.25).toFixed(1)),
          speedLabel: this.getSpeedLabel(Math.max(1.1, 4.0 - (newStageNum - 1) * 0.25)),
          bodySizeScale: 1.15,
          sparkBlastScale: 1.0,
          chainBlastScale: 1.0,
          sparkDurationScale: 1.0,
          chainDurationScale: 1.0,
          parTime: +(4.5 + newStageNum * 0.5).toFixed(1),
          charges: newStageNum > 9 ? 2 : 1,
          distribution: { standard: Math.min(55, 8 + newStageNum * 4) },
          bodies: { standard: { count: Math.min(55, 8 + newStageNum * 4), size: 1.15, speed: 1.0, blast: 1.0, duration: 1.0 } },
          walls: []
        }
      }
    };

    levels.push(newLvl);
    this.selectLevel(levels.length - 1);
  }

  duplicateLevel() {
    const levels = this.activeCampaign.levels;
    const current = this.activeLevel;
    const copy = JSON.parse(JSON.stringify(current));
    copy.title = `${copy.title} (Copy)`;
    copy.level = levels.length + 1;

    levels.splice(this.activeLevelIndex + 1, 0, copy);
    levels.forEach((lvl, i) => { lvl.level = i + 1; });

    this.selectLevel(this.activeLevelIndex + 1);
  }

  deleteLevel() {
    const levels = this.activeCampaign.levels;
    if (levels.length <= 1) {
      alert('A campaign must contain at least 1 level.');
      return;
    }

    if (confirm(`Delete Stage ${this.activeLevel.level}: "${this.activeLevel.title}"?`)) {
      levels.splice(this.activeLevelIndex, 1);
      levels.forEach((lvl, i) => { lvl.level = i + 1; });
      this.selectLevel(Math.min(this.activeLevelIndex, levels.length - 1));
    }
  }

  loadLevelToInspector() {
    const lvl = this.activeLevel;
    const spec = this.activeFormatSpec;

    inputLevelNum.value = lvl.level || (this.activeLevelIndex + 1);
    inputLevelTitle.value = lvl.title || '';
    inputLevelTip.value = lvl.tip || '';

    // Target Platform Tab UI
    btnTargetDesktop.classList.toggle('active', this.editingFormat === 'desktop');
    btnTargetMobile.classList.toggle('active', this.editingFormat === 'mobile');

    // Per-Body Controls (Qty, Size, Speed, Blast, Duration)
    entityTypes.forEach(type => {
      const bodySpec = spec.bodies[type] || { count: 0, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
      const count = bodySpec.count || 0;
      const size = bodySpec.size !== undefined ? bodySpec.size : 1.0;
      const speed = bodySpec.speed !== undefined ? bodySpec.speed : 1.0;
      const blast = bodySpec.blast !== undefined ? bodySpec.blast : 1.0;
      const duration = bodySpec.duration !== undefined ? bodySpec.duration : 1.0;

      if (entitySliders[type]) entitySliders[type].value = count;
      if (entitySizeSliders[type]) entitySizeSliders[type].value = size;
      if (entitySpeedSliders[type]) entitySpeedSliders[type].value = speed;
      if (entityBlastSliders[type]) entityBlastSliders[type].value = blast;
      if (entityDurationSliders[type]) entityDurationSliders[type].value = duration;

      if (entityValueLabels[type]) entityValueLabels[type].textContent = count;
      if (entitySizeLabels[type]) entitySizeLabels[type].textContent = `${size.toFixed(2)}x`;
      if (entitySpeedLabels[type]) entitySpeedLabels[type].textContent = `${speed.toFixed(2)}x`;
      if (entityBlastLabels[type]) entityBlastLabels[type].textContent = `${blast.toFixed(2)}x`;
      if (entityDurationLabels[type]) entityDurationLabels[type].textContent = `${duration.toFixed(2)}x`;
    });

    this.updateTotalParticlesBadge();

    // Global Base Velocity
    const speed = spec.baseSpeed || 2.4;
    sliderBaseSpeed.value = speed;
    labelSpeedTier.textContent = `${speed} (${spec.speedLabel || this.getSpeedLabel(speed)})`;

    // Global Base Body Size Multiplier
    const bodyScale = spec.bodySizeScale !== undefined ? spec.bodySizeScale : (this.editingFormat === 'mobile' ? 1.15 : 1.0);
    sliderBodyScale.value = bodyScale;
    this.updateBodyScaleLabel(bodyScale);

    // Global User Spark Explosion Radius & Duration
    const sparkBlast = spec.sparkBlastScale !== undefined ? spec.sparkBlastScale : 1.0;
    sliderSparkBlast.value = sparkBlast;
    labelSparkBlast.textContent = `${sparkBlast.toFixed(2)}x (${this.getBlastLabel(sparkBlast)})`;

    const sparkDuration = spec.sparkDurationScale !== undefined ? spec.sparkDurationScale : 1.0;
    sliderSparkDuration.value = sparkDuration;
    labelSparkDuration.textContent = `${sparkDuration.toFixed(2)}x (${(2.8 * sparkDuration).toFixed(1)}s)`;

    // Global Chain Explosion Base Radius & Duration
    const chainBlast = spec.chainBlastScale !== undefined ? spec.chainBlastScale : 1.0;
    sliderChainBlast.value = chainBlast;
    labelChainBlast.textContent = `${chainBlast.toFixed(2)}x (${this.getBlastLabel(chainBlast)})`;

    const chainDuration = spec.chainDurationScale !== undefined ? spec.chainDurationScale : 1.0;
    sliderChainDuration.value = chainDuration;
    labelChainDuration.textContent = `${chainDuration.toFixed(2)}x (${(2.8 * chainDuration).toFixed(1)}s)`;

    // Wall Count Badge
    wallCountBadge.textContent = (spec.walls && spec.walls.length) || 0;

    // Charges
    chargeBtns.forEach(btn => {
      const c = parseInt(btn.dataset.charges, 10);
      btn.classList.toggle('active', c === (spec.charges || 1));
    });

    // Quotas & Par
    inputQuotaTarget.value = spec.target || 1;
    const stars = spec.stars || [spec.target, Math.round(spec.totalParticles * 0.5), Math.round(spec.totalParticles * 0.75)];
    inputQuotaStar2.value = stars[1] || Math.round(spec.totalParticles * 0.5);
    inputQuotaStar3.value = stars[2] || Math.round(spec.totalParticles * 0.75);
    inputParTime.value = spec.parTime || 5.0;
  }

  getBlastLabel(val) {
    if (val <= 0.7) return 'Compact / Tight';
    if (val <= 1.15) return 'Standard';
    if (val <= 1.6) return 'Expanded';
    return 'Massive Shockwave';
  }

  updateBodyScaleLabel(val) {
    let desc = 'Standard (1.0x)';
    if (val <= 0.7) desc = `${val}x (Compact / Dense)`;
    else if (val <= 1.15) desc = `${val}x (Standard)`;
    else if (val <= 1.7) desc = `${val}x (Expanded)`;
    else desc = `${val}x (Gigantic / High-Contact)`;
    labelBodyScale.textContent = desc;
  }

  updateTotalParticlesBadge() {
    let total = 0;
    const spec = this.activeFormatSpec;
    entityTypes.forEach(type => {
      const b = spec.bodies[type];
      total += b ? b.count : 0;
    });
    totalParticlesBadge.textContent = `${total} Bodies`;
    spec.totalParticles = total;
  }

  getSpeedLabel(speed) {
    if (speed >= 4.4) return 'High Velocity (Easy)';
    if (speed >= 4.0) return 'Swift';
    if (speed >= 3.6) return 'Brisk';
    if (speed >= 3.2) return 'Rapid';
    if (speed >= 2.8) return 'Moderate';
    if (speed >= 2.4) return 'Cruising';
    if (speed >= 2.0) return 'Steady';
    if (speed >= 1.7) return 'Deliberate';
    if (speed >= 1.4) return 'Slow';
    if (speed >= 1.2) return 'Very Slow (Hard)';
    return 'Glacial Precision (Mastery)';
  }

  autoBalanceQuotas() {
    const spec = this.activeFormatSpec;
    let total = 0;
    entityTypes.forEach(type => {
      total += spec.bodies[type] ? spec.bodies[type].count : 0;
    });
    if (total === 0) total = 10;

    const speed = parseFloat(sliderBaseSpeed.value);

    let passRatio = 0.22;
    if (speed >= 4.0) passRatio = 0.12;
    else if (speed >= 3.0) passRatio = 0.28;
    else if (speed >= 2.0) passRatio = 0.45;
    else passRatio = 0.60;

    const target = Math.max(1, Math.round(total * passRatio));
    const star2 = Math.max(target + 1, Math.round(total * 0.50));
    const star3 = Math.max(star2 + 1, Math.round(total * 0.75));
    const parTime = +(Math.max(4.0, 4.0 + (5.0 - speed) * 1.4)).toFixed(1);

    spec.target = target;
    spec.stars = [target, star2, star3];
    spec.parTime = parTime;

    inputQuotaTarget.value = target;
    inputQuotaStar2.value = star2;
    inputQuotaStar3.value = star3;
    inputParTime.value = parTime;

    this.showToast(`Auto-balanced targets for ${this.editingFormat}!`);
    this.respawnSimulation();
  }

  switchFormatSpec(format) {
    this.editingFormat = format;
    const targetViewport = format === 'mobile' ? 'mobile-portrait' : 'desktop-16-10';
    
    formatBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === targetViewport);
    });

    this.applyViewportFormat(targetViewport);
    this.loadLevelToInspector();
    this.renderLevelSequenceList();
    this.showToast(`Switched to ${format.toUpperCase()} Specification`);
  }

  copyToOppositeFormat() {
    const source = this.editingFormat;
    const target = source === 'desktop' ? 'mobile' : 'desktop';
    const sourceSpec = this.activeLevel.formats[source];

    this.activeLevel.formats[target] = JSON.parse(JSON.stringify(sourceSpec));
    this.showToast(`Copied ${source.toUpperCase()} spec to ${target.toUpperCase()}!`);
  }

  applyViewportFormat(format) {
    this.viewportFormat = format;
    viewportWrapper.className = `viewport-frame-wrapper ${format}`;

    let w = 960;
    let h = 600;
    let desc = '960 × 600 (16:10)';

    if (format === 'desktop-16-9') {
      w = 960;
      h = 540;
      desc = '960 × 540 (16:9)';
    } else if (format === 'mobile-portrait') {
      w = 540;
      h = 960;
      desc = '540 × 960 (9:16 Portrait)';
    }

    resolutionLabel.textContent = desc;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    this.arena = {
      x: 0,
      y: 0,
      width: w,
      height: h
    };

    const refW = format === 'mobile-portrait' ? 540 : REFERENCE_ARENA.width;
    this.scale = w / refW;
    this.grid.resize(this.arena, this.scale);
    this.respawnSimulation();
  }

  respawnSimulation() {
    const spec = this.activeFormatSpec;
    this.explodedCount = 0;
    this.comboChain = 0;
    this.highestCombo = 0;
    this.charges = spec.charges || 1;
    this.elapsedTime = 0;
    this.simState = 'ready';

    this.explosions = [];
    this.shrapnels = [];
    this.floatingTexts = [];
    this.particles = [];

    let seed = this.isSeedLocked ? this.lockedSeed : Math.random();
    let rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const baseSpeed = spec.baseSpeed || 2.4;
    const globalBodyScale = spec.bodySizeScale !== undefined ? spec.bodySizeScale : (this.editingFormat === 'mobile' ? 1.15 : 1.0);
    
    const typesToSpawn = [];
    for (const [typeId, bodySpec] of Object.entries(spec.bodies || {})) {
      const count = typeof bodySpec === 'number' ? bodySpec : (bodySpec.count || 0);
      const size = typeof bodySpec === 'object' && bodySpec.size !== undefined ? bodySpec.size : 1.0;
      const speedScale = typeof bodySpec === 'object' && bodySpec.speed !== undefined ? bodySpec.speed : 1.0;
      const blastScale = typeof bodySpec === 'object' && bodySpec.blast !== undefined ? bodySpec.blast : 1.0;
      const durationScale = typeof bodySpec === 'object' && bodySpec.duration !== undefined ? bodySpec.duration : 1.0;
      for (let i = 0; i < count; i++) {
        typesToSpawn.push({ typeId, size, speedScale, blastScale, durationScale });
      }
    }

    typesToSpawn.sort(() => rng() - 0.5);
    typesToSpawn.forEach(item => {
      const margin = 28 * this.scale;
      const x = this.arena.x + margin + rng() * (this.arena.width - margin * 2);
      const y = this.arena.y + margin + rng() * (this.arena.height - margin * 2);
      this.particles.push(new Particle(x, y, item.typeId, baseSpeed, this.arena, this.scale, item.size, item.speedScale, item.blastScale, item.durationScale, globalBodyScale));
    });

    if (this.activeTool === 'spark') {
      clickPrompt.style.display = 'block';
      clickPrompt.textContent = `Click inside arena to ignite reaction (${this.editingFormat.toUpperCase()})`;
    } else if (this.activeTool === 'wall') {
      clickPrompt.style.display = 'block';
      clickPrompt.textContent = 'Click & drag inside arena to draw barrier walls';
    } else {
      clickPrompt.style.display = 'block';
      clickPrompt.textContent = 'Click any barrier wall to erase it';
    }

    this.updateTelemetryHUD();
  }

  triggerSpark(x, y) {
    if (
      x < this.arena.x ||
      x > this.arena.x + this.arena.width ||
      y < this.arena.y ||
      y > this.arena.y + this.arena.height
    ) return;

    if (this.charges <= 0) return;

    soundEngine.playSeedTrigger();

    const sparkBlast = this.activeFormatSpec.sparkBlastScale || 1.0;
    const sparkDuration = this.activeFormatSpec.sparkDurationScale || 1.0;
    const config = { baseRadius: 65 * sparkBlast, baseDuration: 2.8 * sparkDuration };

    this.explosions.push(new Explosion(x, y, null, config, Math.random() * Math.PI, true, this.scale, 1.0, 1.0));
    this.sparklePool.spawnBurst(x, y, '#38bdf8', 16, 1.1, this.scale);
    this.grid.applyExplosionImpulse(x, y, 75 * this.scale * sparkBlast, 70, false);

    this.charges--;
    this.simState = 'active';
    clickPrompt.style.display = 'none';
    this.updateTelemetryHUD();
  }

  spawnShrapnel(x, y) {
    const dartCount = 4;
    for (let i = 0; i < dartCount; i++) {
      const angle = (Math.PI * 2 / dartCount) * i + (Math.random() * 0.3 - 0.15);
      this.shrapnels.push(new Shrapnel(x, y, angle, 8.5, this.arena, this.scale));
    }
  }

  updatePhysics(dt) {
    if (this.simState === 'active') {
      this.elapsedTime += dt;
    }

    const walls = this.activeFormatSpec.walls || [];

    // Explosions & Singularities
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
          if (p.alive) p.applyForce(exp.x, exp.y, exp.vortexForce, dt);
        }
      }

      if (!exp.alive) this.explosions.splice(i, 1);
    }

    this.grid.update(dt);
    const chainBlast = this.activeFormatSpec.chainBlastScale || 1.0;
    const chainDuration = this.activeFormatSpec.chainDurationScale || 1.0;
    const config = { baseRadius: 65 * chainBlast, baseDuration: 2.8 * chainDuration };

    // Particles & Collisions
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.alive) continue;

      p.update(dt, 1.0, walls);

      for (let e = 0; e < this.explosions.length; e++) {
        const exp = this.explosions[e];
        if (exp.checkCollision(p)) {
          p.alive = false;
          this.explodedCount++;
          this.comboChain++;
          if (this.comboChain > this.highestCombo) this.highestCombo = this.comboChain;

          soundEngine.playExplosionChime(this.comboChain, p.type.id);
          this.explosions.push(new Explosion(p.x, p.y, p.type, config, p.rotation, false, this.scale, p.blastScale || 1.0, p.durationScale || 1.0));
          this.grid.applyExplosionImpulse(p.x, p.y, 60 * this.scale * (p.blastScale || 1.0), 50, false);

          const sparkleCount = Math.min(28, 16 + this.comboChain);
          this.sparklePool.spawnBurst(p.x, p.y, p.type.color, sparkleCount, 1.0, this.scale);

          if (p.type.givesCharge) {
            this.charges++;
            this.floatingTexts.push(new FloatingText(p.x, p.y - 20 * this.scale, '+1 SPARK!', '#ffffff', 18, true, this.scale));
          }

          this.updateTelemetryHUD();
          break;
        }
      }
    }

    // Shrapnel
    for (let s = this.shrapnels.length - 1; s >= 0; s--) {
      const shrapnel = this.shrapnels[s];
      shrapnel.update(dt, walls);
      if (!shrapnel.alive) {
        this.shrapnels.splice(s, 1);
        continue;
      }

      for (let pIdx = 0; pIdx < this.particles.length; pIdx++) {
        const p = this.particles[pIdx];
        if (!p.alive) continue;
        const dx = shrapnel.x - p.x;
        const dy = shrapnel.y - p.y;
        const combined = shrapnel.radius + p.radius;
        if (dx * dx + dy * dy <= combined * combined) {
          shrapnel.alive = false;
          p.alive = false;
          this.explodedCount++;
          this.comboChain++;
          if (this.comboChain > this.highestCombo) this.highestCombo = this.comboChain;

          soundEngine.playExplosionChime(this.comboChain, p.type.id);
          this.explosions.push(new Explosion(p.x, p.y, p.type, config, p.rotation, false, this.scale, p.blastScale || 1.0, p.durationScale || 1.0));
          this.grid.applyExplosionImpulse(p.x, p.y, 50 * this.scale * (p.blastScale || 1.0), 40, false);
          this.sparklePool.spawnBurst(p.x, p.y, '#e879f9', 16, 1.1, this.scale);
          this.updateTelemetryHUD();
          break;
        }
      }
    }

    this.sparklePool.update(dt);

    for (let t = this.floatingTexts.length - 1; t >= 0; t--) {
      const ft = this.floatingTexts[t];
      ft.update(dt);
      if (!ft.alive) this.floatingTexts.splice(t, 1);
    }

    if (this.simState === 'active' && this.explosions.length === 0 && this.shrapnels.length === 0) {
      if (this.charges <= 0 || this.particles.filter(p => p.alive).length === 0) {
        this.simState = 'finished';
        this.updateTelemetryHUD();
      }
    }
  }

  updateTelemetryHUD() {
    const spec = this.activeFormatSpec;
    const total = spec.totalParticles || this.particles.length || 1;
    const pct = Math.round((this.explodedCount / total) * 100);

    telPopped.textContent = `${this.explodedCount} / ${total} (${pct}%)`;
    telCombo.textContent = `x${this.highestCombo}`;
    telTime.textContent = `${this.elapsedTime.toFixed(1)}s / ${spec.parTime || 5.0}s`;
    telSparks.textContent = this.charges;

    const starsThresholds = spec.stars || [spec.target, Math.round(total * 0.5), Math.round(total * 0.75)];
    let stars = 0;
    if (this.explodedCount >= starsThresholds[2]) stars = 3;
    else if (this.explodedCount >= starsThresholds[1]) stars = 2;
    else if (this.explodedCount >= starsThresholds[0]) stars = 1;

    let starStr = '☆☆☆';
    if (stars === 3) starStr = '★★★ (Mastery)';
    else if (stars === 2) starStr = '★★☆ (Great)';
    else if (stars === 1) starStr = '★☆☆ (Pass)';
    else starStr = '☆☆☆ (Failed)';
    telStars.textContent = starStr;
  }

  snapToGridVertex(clickX, clickY) {
    if (!this.snapGrid) {
      const relX = (clickX - this.arena.x) / this.arena.width;
      const relY = (clickY - this.arena.y) / this.arena.height;
      return {
        x: +Math.max(0.01, Math.min(0.99, relX)).toFixed(4),
        y: +Math.max(0.01, Math.min(0.99, relY)).toFixed(4),
        pixelX: clickX,
        pixelY: clickY
      };
    }

    const spacing = this.grid.spacing;
    const relPixelX = clickX - this.arena.x;
    const relPixelY = clickY - this.arena.y;

    const cols = this.grid.cols;
    const rows = this.grid.rows;

    let c = Math.round(relPixelX / spacing);
    let r = Math.round(relPixelY / spacing);

    c = Math.max(0, Math.min(c, cols - 1));
    r = Math.max(0, Math.min(r, rows - 1));

    const nodeIdx = r * cols + c;
    const node = this.grid.nodes && this.grid.nodes[nodeIdx];

    let snappedPixelX = node ? node.x : (this.arena.x + c * spacing);
    let snappedPixelY = node ? node.y : (this.arena.y + r * spacing);

    // Pin cleanly to arena bounds
    if (snappedPixelX < this.arena.x) snappedPixelX = this.arena.x;
    if (snappedPixelX > this.arena.x + this.arena.width) snappedPixelX = this.arena.x + this.arena.width;
    if (snappedPixelY < this.arena.y) snappedPixelY = this.arena.y;
    if (snappedPixelY > this.arena.y + this.arena.height) snappedPixelY = this.arena.y + this.arena.height;

    const relX = (snappedPixelX - this.arena.x) / this.arena.width;
    const relY = (snappedPixelY - this.arena.y) / this.arena.height;

    return {
      x: +relX.toFixed(4),
      y: +relY.toFixed(4),
      pixelX: snappedPixelX,
      pixelY: snappedPixelY
    };
  }

  renderLoop(time) {
    const rawDt = Math.min((time - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = time;

    try {
      const dt = rawDt * this.simSpeed;
      this.updatePhysics(dt);

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.arena.width, this.arena.height);

      ctx.save();
      // 1. Spacetime Grid
      this.grid.draw(ctx);

      // 2. Neon Perimeter Border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = Math.max(1.2, 1.8 * this.scale);
      ctx.strokeRect(this.arena.x, this.arena.y, this.arena.width, this.arena.height);

      // 3. Render Level Obstacle Barrier Walls
      const walls = this.activeFormatSpec.walls || [];
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const wx1 = this.arena.x + w.x1 * this.arena.width;
        const wy1 = this.arena.y + w.y1 * this.arena.height;
        const wx2 = this.arena.x + w.x2 * this.arena.width;
        const wy2 = this.arena.y + w.y2 * this.arena.height;
        drawObstacleWall(ctx, wx1, wy1, wx2, wy2, this.scale);
      }

      // Render Obstacle Wall Snap Reticle & Active Drawing Line
      if (this.activeTool === 'wall') {
        if (!this.isDrawingWall && this.hoverCursorPos) {
          const snap = this.snapToGridVertex(this.hoverCursorPos.x, this.hoverCursorPos.y);
          ctx.save();
          // Magnetic Snap Reticle on Mesh Vertex
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = Math.max(1.2, 1.8 * this.scale);
          ctx.beginPath();
          ctx.arc(snap.pixelX, snap.pixelY, 6.5 * this.scale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(snap.pixelX, snap.pixelY, 2.5 * this.scale, 0, Math.PI * 2);
          ctx.fill();

          // Reticle Crosshairs
          const cross = 11 * this.scale;
          ctx.beginPath();
          ctx.moveTo(snap.pixelX - cross, snap.pixelY);
          ctx.lineTo(snap.pixelX - 7 * this.scale, snap.pixelY);
          ctx.moveTo(snap.pixelX + 7 * this.scale, snap.pixelY);
          ctx.lineTo(snap.pixelX + cross, snap.pixelY);
          ctx.moveTo(snap.pixelX, snap.pixelY - cross);
          ctx.lineTo(snap.pixelX, snap.pixelY - 7 * this.scale);
          ctx.moveTo(snap.pixelX, snap.pixelY + 7 * this.scale);
          ctx.lineTo(snap.pixelX, snap.pixelY + cross);
          ctx.stroke();
          ctx.restore();
        }

        if (this.isDrawingWall && this.wallStartPos && this.wallCurrentPos) {
          const wx1 = this.wallStartPos.pixelX;
          const wy1 = this.wallStartPos.pixelY;
          const wx2 = this.wallCurrentPos.pixelX;
          const wy2 = this.wallCurrentPos.pixelY;

          ctx.save();
          // Neon glow line aligned with spacetime mesh
          ctx.strokeStyle = '#e879f9';
          ctx.shadowColor = '#e879f9';
          ctx.shadowBlur = 12 * this.scale;
          ctx.lineWidth = Math.max(2, 3.5 * this.scale);
          ctx.setLineDash([8 * this.scale, 5 * this.scale]);
          ctx.beginPath();
          ctx.moveTo(wx1, wy1);
          ctx.lineTo(wx2, wy2);
          ctx.stroke();

          // Mesh Vertex Cap Nodes
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          [ [wx1, wy1], [wx2, wy2] ].forEach(([nx, ny]) => {
            ctx.beginPath();
            ctx.arc(nx, ny, 5.5 * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 1.5 * this.scale;
            ctx.stroke();
          });
          ctx.restore();
        }
      }

      // 4. Explosions
      for (let i = 0; i < this.explosions.length; i++) {
        this.explosions[i].draw(ctx);
      }

      // 5. Shrapnels
      for (let i = 0; i < this.shrapnels.length; i++) {
        this.shrapnels[i].draw(ctx);
      }

      // 6. Particles
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].draw(ctx);
      }

      // 7. Sparkle Pool
      this.sparklePool.draw(ctx);

      // 8. Floating Texts
      for (let i = 0; i < this.floatingTexts.length; i++) {
        this.floatingTexts[i].draw(ctx);
      }
      ctx.restore();
    } catch (err) {
      console.error('Studio simulation frame error:', err);
    }

    requestAnimationFrame(this.renderLoop.bind(this));
  }

  showToast(msg) {
    const t = document.createElement('div');
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.right = '20px';
    t.style.background = 'var(--accent-cyan)';
    t.style.color = '#030712';
    t.style.padding = '10px 18px';
    t.style.borderRadius = 'var(--radius-pill)';
    t.style.fontWeight = '800';
    t.style.fontSize = '0.85rem';
    t.style.zIndex = '999';
    t.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.6)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  setupEventListeners() {
    // Canvas Pointer Events
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (this.arena.width / rect.width);
      const clickY = (e.clientY - rect.top) * (this.arena.height / rect.height);

      if (this.activeTool === 'spark') {
        this.triggerSpark(clickX, clickY);
      } else if (this.activeTool === 'wall') {
        this.isDrawingWall = true;
        const snap = this.snapToGridVertex(clickX, clickY);
        this.wallStartPos = snap;
        this.wallCurrentPos = snap;
      } else if (this.activeTool === 'erase') {
        const walls = this.activeFormatSpec.walls || [];
        for (let i = walls.length - 1; i >= 0; i--) {
          const w = walls[i];
          const wx1 = this.arena.x + w.x1 * this.arena.width;
          const wy1 = this.arena.y + w.y1 * this.arena.height;
          const wx2 = this.arena.x + w.x2 * this.arena.width;
          const wy2 = this.arena.y + w.y2 * this.arena.height;
          
          const dx = wx2 - wx1;
          const dy = wy2 - wy1;
          const lenSq = dx * dx + dy * dy;
          const t = Math.max(0, Math.min(1, ((clickX - wx1) * dx + (clickY - wy1) * dy) / (lenSq || 1)));
          const qx = wx1 + t * dx;
          const qy = wy1 + t * dy;
          const distSq = (clickX - qx) * (clickX - qx) + (clickY - qy) * (clickY - qy);

          if (distSq < (18 * this.scale) * (18 * this.scale)) {
            walls.splice(i, 1);
            this.showToast('Obstacle wall erased');
            wallCountBadge.textContent = walls.length;
            this.renderLevelSequenceList();
            this.respawnSimulation();
            break;
          }
        }
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) * (this.arena.width / rect.width);
      const clickY = (e.clientY - rect.top) * (this.arena.height / rect.height);
      this.hoverCursorPos = { x: clickX, y: clickY };

      if (this.isDrawingWall && this.wallStartPos) {
        const snap = this.snapToGridVertex(clickX, clickY);
        this.wallCurrentPos = snap;
      }
    });

    canvas.addEventListener('pointerleave', () => {
      this.hoverCursorPos = null;
    });

    window.addEventListener('pointerup', () => {
      if (this.isDrawingWall && this.wallStartPos && this.wallCurrentPos) {
        const dx = this.wallCurrentPos.x - this.wallStartPos.x;
        const dy = this.wallCurrentPos.y - this.wallStartPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.012) {
          if (!this.activeFormatSpec.walls) this.activeFormatSpec.walls = [];
          this.activeFormatSpec.walls.push({
            x1: +this.wallStartPos.x.toFixed(4),
            y1: +this.wallStartPos.y.toFixed(4),
            x2: +this.wallCurrentPos.x.toFixed(4),
            y2: +this.wallCurrentPos.y.toFixed(4)
          });
          this.showToast(`Obstacle wall snapped to mesh vertices! (${this.editingFormat.toUpperCase()})`);
          wallCountBadge.textContent = this.activeFormatSpec.walls.length;
          this.renderLevelSequenceList();
          this.respawnSimulation();
        }
        this.isDrawingWall = false;
        this.wallStartPos = null;
        this.wallCurrentPos = null;
      }
    });

    // Platform Spec Buttons (Desktop vs Mobile)
    btnTargetDesktop.addEventListener('click', () => this.switchFormatSpec('desktop'));
    btnTargetMobile.addEventListener('click', () => this.switchFormatSpec('mobile'));
    btnSyncFormats.addEventListener('click', () => this.copyToOppositeFormat());

    // Tool Buttons (Spark / Wall / Erase)
    toolPillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolPillBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.dataset.tool;
        this.respawnSimulation();
      });
    });

    // Snap to Grid (Mesh Vertices)
    btnSnapGrid.addEventListener('click', () => {
      this.snapGrid = !this.snapGrid;
      btnSnapGrid.classList.toggle('active', this.snapGrid);
      btnSnapGrid.textContent = this.snapGrid ? '🧲 Mesh Snap' : '🔓 Free Draw';
      this.showToast(this.snapGrid ? 'Mesh Vertex Snapping (Spacetime Grid) Enabled' : 'Freeform Wall Drawing');
    });

    // Clear All Walls
    btnClearWalls.addEventListener('click', () => {
      if (this.activeFormatSpec.walls && this.activeFormatSpec.walls.length > 0) {
        if (confirm(`Clear all ${this.activeFormatSpec.walls.length} obstacle wall(s) in this ${this.editingFormat} stage?`)) {
          this.activeFormatSpec.walls = [];
          wallCountBadge.textContent = '0';
          this.renderLevelSequenceList();
          this.respawnSimulation();
          this.showToast('Cleared all obstacle walls');
        }
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        this.respawnSimulation();
      } else if (e.key === 'w' || e.key === 'W') {
        const wallBtn = document.getElementById('btn-tool-wall');
        if (wallBtn) wallBtn.click();
      } else if (e.key === ' ') {
        const sparkBtn = document.getElementById('btn-tool-spark');
        if (sparkBtn) sparkBtn.click();
      }
    });

    // Viewport Format Switcher
    formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyViewportFormat(btn.dataset.format);
      });
    });

    // Campaign Selector
    selectActiveCampaign.addEventListener('change', (e) => {
      this.activeCampaignIndex = parseInt(e.target.value, 10);
      this.activeLevelIndex = 0;
      this.bindCampaignMeta();
      this.renderLevelSequenceList();
      this.loadLevelToInspector();
      this.respawnSimulation();
    });

    // Campaign Meta inputs
    inputCampaignTitle.addEventListener('input', (e) => {
      this.activeCampaign.title = e.target.value;
      this.populateCampaignSelect();
    });
    inputCampaignTagline.addEventListener('input', (e) => {
      this.activeCampaign.tagline = e.target.value;
    });
    inputCampaignBadge.addEventListener('input', (e) => {
      this.activeCampaign.badge = e.target.value;
      this.populateCampaignSelect();
    });
    inputCampaignColor.addEventListener('input', (e) => {
      this.activeCampaign.color = e.target.value;
    });

    // New Campaign Button
    btnNewCampaign.addEventListener('click', () => {
      const id = `custom-pack-${Date.now().toString().slice(-4)}`;
      const newCamp = {
        id,
        title: 'Custom Campaign',
        tagline: 'Authored in GeoChain Studio',
        description: 'Custom puzzle sequence with granular explosion physics.',
        badge: '✨',
        color: '#facc15',
        author: 'Designer',
        version: '1.0.0',
        levels: [
          {
            level: 1,
            title: 'Initiation',
            tip: 'First test stage with custom mechanics.',
            formats: {
              desktop: {
                target: 3,
                stars: [3, 6, 9],
                totalParticles: 12,
                baseSpeed: 4.2,
                speedLabel: 'Swift',
                bodySizeScale: 1.0,
                sparkBlastScale: 1.0,
                chainBlastScale: 1.0,
                sparkDurationScale: 1.0,
                chainDurationScale: 1.0,
                parTime: 5.0,
                charges: 1,
                distribution: { standard: 12 },
                bodies: { standard: { count: 12, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 } },
                walls: []
              },
              mobile: {
                target: 2,
                stars: [2, 5, 7],
                totalParticles: 9,
                baseSpeed: 3.8,
                speedLabel: 'Brisk',
                bodySizeScale: 1.15,
                sparkBlastScale: 1.0,
                chainBlastScale: 1.0,
                sparkDurationScale: 1.0,
                chainDurationScale: 1.0,
                parTime: 5.0,
                charges: 1,
                distribution: { standard: 9 },
                bodies: { standard: { count: 9, size: 1.15, speed: 1.0, blast: 1.0, duration: 1.0 } },
                walls: []
              }
            }
          }
        ]
      };
      this.campaigns.push(newCamp);
      this.activeCampaignIndex = this.campaigns.length - 1;
      this.activeLevelIndex = 0;
      this.populateCampaignSelect();
      this.bindCampaignMeta();
      this.renderLevelSequenceList();
      this.loadLevelToInspector();
      this.respawnSimulation();
      this.showToast('Created new campaign pack!');
    });

    // Level Sequence Action Buttons
    btnAddLevel.addEventListener('click', () => this.addNewLevel());
    btnDuplicateLevel.addEventListener('click', () => this.duplicateLevel());
    btnDeleteLevel.addEventListener('click', () => this.deleteLevel());

    // Level Identity Inputs
    inputLevelTitle.addEventListener('input', (e) => {
      this.activeLevel.title = e.target.value;
      this.renderLevelSequenceList();
    });
    inputLevelNum.addEventListener('input', (e) => {
      this.activeLevel.level = parseInt(e.target.value, 10);
      this.renderLevelSequenceList();
    });
    inputLevelTip.addEventListener('input', (e) => {
      this.activeLevel.tip = e.target.value;
    });

    // Per-Body Control Event Listeners (Qty, Size, Speed, Blast, Duration)
    entityTypes.forEach(type => {
      // 1. Quantity Slider
      if (entitySliders[type]) {
        entitySliders[type].addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          entityValueLabels[type].textContent = val;
          if (!this.activeFormatSpec.bodies[type]) this.activeFormatSpec.bodies[type] = { count: 0, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
          this.activeFormatSpec.bodies[type].count = val;
          if (!this.activeFormatSpec.distribution) this.activeFormatSpec.distribution = {};
          this.activeFormatSpec.distribution[type] = val;
          this.updateTotalParticlesBadge();
          this.renderLevelSequenceList();
          this.respawnSimulation();
        });
      }

      // 2. Size Scale Slider
      if (entitySizeSliders[type]) {
        entitySizeSliders[type].addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          entitySizeLabels[type].textContent = `${val.toFixed(2)}x`;
          if (!this.activeFormatSpec.bodies[type]) this.activeFormatSpec.bodies[type] = { count: 0, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
          this.activeFormatSpec.bodies[type].size = val;
          this.particles.filter(p => p.type.id === type).forEach(p => p.rescale(this.arena, this.scale, null, val, null, null, null, null, null));
        });
      }

      // 3. Speed Scale Slider
      if (entitySpeedSliders[type]) {
        entitySpeedSliders[type].addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          entitySpeedLabels[type].textContent = `${val.toFixed(2)}x`;
          if (!this.activeFormatSpec.bodies[type]) this.activeFormatSpec.bodies[type] = { count: 0, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
          this.activeFormatSpec.bodies[type].speed = val;
          this.particles.filter(p => p.type.id === type).forEach(p => p.rescale(this.arena, this.scale, null, null, val, null, null, null, null));
        });
      }

      // 4. Blast Radius Scale Slider
      if (entityBlastSliders[type]) {
        entityBlastSliders[type].addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          entityBlastLabels[type].textContent = `${val.toFixed(2)}x`;
          if (!this.activeFormatSpec.bodies[type]) this.activeFormatSpec.bodies[type] = { count: 0, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
          this.activeFormatSpec.bodies[type].blast = val;
          this.particles.filter(p => p.type.id === type).forEach(p => { p.blastScale = val; });
        });
      }

      // 5. Duration Scale Slider
      if (entityDurationSliders[type]) {
        entityDurationSliders[type].addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          entityDurationLabels[type].textContent = `${val.toFixed(2)}x`;
          if (!this.activeFormatSpec.bodies[type]) this.activeFormatSpec.bodies[type] = { count: 0, size: 1.0, speed: 1.0, blast: 1.0, duration: 1.0 };
          this.activeFormatSpec.bodies[type].duration = val;
          this.particles.filter(p => p.type.id === type).forEach(p => { p.durationScale = val; });
        });
      }
    });

    // Speed Slider
    sliderBaseSpeed.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const label = this.getSpeedLabel(val);
      labelSpeedTier.textContent = `${val.toFixed(1)} (${label})`;
      this.activeFormatSpec.baseSpeed = val;
      this.activeFormatSpec.speedLabel = label;
      this.renderLevelSequenceList();
      this.particles.forEach(p => p.rescale(this.arena, this.scale, null, null, null, null, null, null, val));
    });

    // Global Base Body Size Multiplier Slider
    sliderBodyScale.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.activeFormatSpec.bodySizeScale = val;
      this.updateBodyScaleLabel(val);
      this.renderLevelSequenceList();
      this.particles.forEach(p => p.rescale(this.arena, this.scale, null, null, null, null, null, val, null));
    });

    // User Spark Explosion Radius Slider
    sliderSparkBlast.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.activeFormatSpec.sparkBlastScale = val;
      labelSparkBlast.textContent = `${val.toFixed(2)}x (${this.getBlastLabel(val)})`;
      this.respawnSimulation();
    });

    // User Spark Explosion Duration Slider
    sliderSparkDuration.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.activeFormatSpec.sparkDurationScale = val;
      labelSparkDuration.textContent = `${val.toFixed(2)}x (${(2.8 * val).toFixed(1)}s)`;
      this.respawnSimulation();
    });

    // Chain Explosion Base Radius Slider
    sliderChainBlast.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.activeFormatSpec.chainBlastScale = val;
      labelChainBlast.textContent = `${val.toFixed(2)}x (${this.getBlastLabel(val)})`;
      this.respawnSimulation();
    });

    // Chain Explosion Base Duration Slider
    sliderChainDuration.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.activeFormatSpec.chainDurationScale = val;
      labelChainDuration.textContent = `${val.toFixed(2)}x (${(2.8 * val).toFixed(1)}s)`;
      this.respawnSimulation();
    });

    // Charges Pill
    chargeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chargeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const c = parseInt(btn.dataset.charges, 10);
        this.activeFormatSpec.charges = c;
        this.charges = c;
        this.respawnSimulation();
      });
    });

    // Quotas & Par
    inputQuotaTarget.addEventListener('input', (e) => {
      this.activeFormatSpec.target = parseInt(e.target.value, 10);
      this.updateTelemetryHUD();
    });
    inputQuotaStar2.addEventListener('input', (e) => {
      if (!this.activeFormatSpec.stars) this.activeFormatSpec.stars = [1, 3, 5];
      this.activeFormatSpec.stars[1] = parseInt(e.target.value, 10);
      this.updateTelemetryHUD();
    });
    inputQuotaStar3.addEventListener('input', (e) => {
      if (!this.activeFormatSpec.stars) this.activeFormatSpec.stars = [1, 3, 5];
      this.activeFormatSpec.stars[2] = parseInt(e.target.value, 10);
      this.updateTelemetryHUD();
    });
    inputParTime.addEventListener('input', (e) => {
      this.activeFormatSpec.parTime = parseFloat(e.target.value);
      this.updateTelemetryHUD();
    });
    btnAutocalcQuotas.addEventListener('click', () => this.autoBalanceQuotas());

    // Simulation Controls
    btnSimReset.addEventListener('click', () => this.respawnSimulation());
    btnLockSeed.addEventListener('click', () => {
      this.isSeedLocked = !this.isSeedLocked;
      if (this.isSeedLocked) {
        this.lockedSeed = Math.random();
        btnLockSeed.textContent = '🔒 Fixed Seed';
        btnLockSeed.classList.add('primary');
      } else {
        btnLockSeed.textContent = '🔓 Random Seed';
        btnLockSeed.classList.remove('primary');
      }
      this.respawnSimulation();
    });

    speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.simSpeed = parseFloat(btn.dataset.speed);
      });
    });

    // JSON Sync & Modals
    btnCopyLevelJson.addEventListener('click', () => {
      const json = JSON.stringify(this.activeLevel, null, 2);
      navigator.clipboard.writeText(json);
      this.showToast('Copied active Level JSON to clipboard!');
    });

    btnExportCampaignJson.addEventListener('click', () => {
      const json = JSON.stringify(this.activeCampaign, null, 2);
      jsonModalTitle.textContent = `Export: ${this.activeCampaign.title}`;
      jsonModalDesc.textContent = 'Copy the campaign JSON below to distribute or paste into levels.js:';
      jsonSyncTextarea.value = json;
      btnApplyJsonImport.style.display = 'none';
      btnCopyTextarea.style.display = 'block';
      modalJsonSync.classList.add('show');
    });

    btnImportJson.addEventListener('click', () => {
      jsonModalTitle.textContent = 'Import Level or Campaign JSON';
      jsonModalDesc.textContent = 'Paste a level or campaign JSON object below:';
      jsonSyncTextarea.value = '';
      btnApplyJsonImport.style.display = 'block';
      btnCopyTextarea.style.display = 'none';
      modalJsonSync.classList.add('show');
    });

    btnApplyJsonImport.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(jsonSyncTextarea.value.trim());
        if (parsed.levels && Array.isArray(parsed.levels)) {
          this.campaigns.push(parsed);
          this.activeCampaignIndex = this.campaigns.length - 1;
          this.activeLevelIndex = 0;
          this.populateCampaignSelect();
          this.bindCampaignMeta();
          this.renderLevelSequenceList();
          this.loadLevelToInspector();
          this.respawnSimulation();
          modalJsonSync.classList.remove('show');
          this.showToast(`Imported campaign "${parsed.title}"!`);
        } else if (parsed.formats || parsed.distribution || parsed.bodies) {
          this.activeCampaign.levels.push(parsed);
          this.activeCampaign.levels.forEach((lvl, i) => { lvl.level = i + 1; });
          this.selectLevel(this.activeCampaign.levels.length - 1);
          modalJsonSync.classList.remove('show');
          this.showToast(`Imported level "${parsed.title || 'Stage'}"!`);
        } else {
          alert('Unrecognized JSON format. Expected level or campaign object.');
        }
      } catch (err) {
        alert(`Invalid JSON format: ${err.message}`);
      }
    });

    btnCopyTextarea.addEventListener('click', () => {
      navigator.clipboard.writeText(jsonSyncTextarea.value);
      this.showToast('Copied JSON to clipboard!');
    });

    btnCloseJsonModal.addEventListener('click', () => modalJsonSync.classList.remove('show'));

    btnSaveDraft.addEventListener('click', () => this.saveDraft());
  }
}

// Instantiate Studio on Load
window.addEventListener('DOMContentLoaded', () => {
  window.studio = new StudioController();
});
