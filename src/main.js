import { ChainReactionGame } from './game.js';
import { CAMPAIGN_LEVELS } from './levels.js';
import { PARTICLE_TYPES } from './particles.js';
import { soundEngine } from './audio.js';
import { cloudLeaderboard } from './leaderboard.js';

// DOM Elements
const canvas = document.getElementById('game-canvas');
const hintBanner = document.getElementById('hint-banner');

// HUD Elements
const hudLevelGroup = document.getElementById('hud-level-group');
const hudLevelValue = document.getElementById('hud-level-value');
const hudScoreValue = document.getElementById('hud-score-value');
const hudComboValue = document.getElementById('hud-combo-value');
const hudChargesValue = document.getElementById('hud-charges-value');
const hudQuotaFill = document.getElementById('hud-quota-fill');
const hudQuotaCurrent = document.getElementById('hud-quota-current');
const hudQuotaTarget = document.getElementById('hud-quota-target');
const hudQuotaContainer = document.getElementById('hud-quota-container');
const btnRestart = document.getElementById('btn-restart');

// Header Buttons
const modeTabs = document.querySelectorAll('.mode-tab-btn');
const btnAudioToggle = document.getElementById('btn-audio-toggle');
const btnLevelSelect = document.getElementById('btn-level-select');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const btnSandboxToggle = document.getElementById('btn-sandbox-toggle');

// Round Result Modal Elements
const modalResult = document.getElementById('modal-result');
const modalResultIcon = document.getElementById('modal-result-icon');
const modalResultTitle = document.getElementById('modal-result-title');
const modalResultDesc = document.getElementById('modal-result-desc');
const modalStarsContainer = document.getElementById('modal-stars-container');
const modalStatExploded = document.getElementById('modal-stat-exploded');
const modalStatScore = document.getElementById('modal-stat-score');
const modalStatBestCombo = document.getElementById('modal-stat-combo');
const modalStatSpeed = document.getElementById('modal-stat-speed');
const modalStatBonus = document.getElementById('modal-stat-bonus');
const modalRowSpeed = document.getElementById('modal-row-speed');
const modalRowBonus = document.getElementById('modal-row-bonus');

// Level Comparison Table in Modal
const levelLeaderboardTitle = document.getElementById('level-leaderboard-title');
const playerRankTag = document.getElementById('player-rank-tag');
const levelTop10Rows = document.getElementById('level-top10-rows');
const highScoreBanner = document.getElementById('high-score-banner');
const highScoreText = document.getElementById('high-score-text');
const playerInitialsInput = document.getElementById('player-initials-input');

const btnModalRetry = document.getElementById('btn-modal-retry');
const btnModalNext = document.getElementById('btn-modal-next');
const btnModalLevels = document.getElementById('btn-modal-levels');

// Campaign Level Selector Modal
const modalLevels = document.getElementById('modal-levels');
const levelsGrid = document.getElementById('levels-grid');
const btnCloseLevels = document.getElementById('btn-close-levels');

// Hall of Fame Leaderboard Modal
const modalLeaderboard = document.getElementById('modal-leaderboard');
const leaderboardRows = document.getElementById('leaderboard-rows');
const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
const btnClearScores = document.getElementById('btn-clear-scores');
const leaderboardFilterTabs = document.querySelectorAll('.leaderboard-filter-tabs .filter-tab');

// Sandbox Tray
const sandboxTray = document.getElementById('sandbox-tray');
const sliderCount = document.getElementById('slider-particle-count');
const valCount = document.getElementById('val-particle-count');
const sliderRadius = document.getElementById('slider-blast-radius');
const valRadius = document.getElementById('val-blast-radius');
const sliderDuration = document.getElementById('slider-blast-duration');
const valDuration = document.getElementById('val-blast-duration');
const sliderSpeed = document.getElementById('slider-particle-speed');
const valSpeed = document.getElementById('val-particle-speed');
const particleChipsContainer = document.getElementById('particle-chips-container');
const btnApplySandbox = document.getElementById('btn-apply-sandbox');

let lastTime = performance.now();
let game = null;
let pendingHighScore = null;
let currentLeaderboardFilter = 'all';

function init() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(dpr, dpr);

  game = new ChainReactionGame(canvas, {
    onStateChange: handleGameStateChange,
    onLevelComplete: handleLevelComplete,
    onChaosComplete: handleChaosComplete
  });

  game.resize(rect.width, rect.height);
  renderSandboxChips();
  game.startCampaignLevel(0);
  setupEventListeners();

  requestAnimationFrame(gameLoop);
}

function handleResize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(dpr, dpr);
  if (game) {
    game.resize(rect.width, rect.height);
  }
}

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (game) {
    game.update(dt);
    game.render();
  }

  requestAnimationFrame(gameLoop);
}

function handleGameStateChange(data) {
  hudScoreValue.textContent = data.score.toLocaleString();
  hudComboValue.textContent = `x${data.combo}`;

  if (data.mode === 'campaign') {
    hudLevelGroup.style.display = 'flex';
    hudLevelValue.textContent = data.level;
    hudChargesValue.textContent = data.charges;
    hudQuotaContainer.style.display = 'flex';

    hudQuotaCurrent.textContent = data.exploded;
    hudQuotaTarget.textContent = data.target;

    const pct = Math.min(100, (data.exploded / data.target) * 100);
    hudQuotaFill.style.width = `${pct}%`;

    const lvlConfig = CAMPAIGN_LEVELS[data.level - 1];
    if (lvlConfig && data.state === 'ready') {
      const starT = lvlConfig.stars ? ` (3★ @ ${lvlConfig.stars[2]})` : '';
      const speedBadge = lvlConfig.speedLabel ? ` • Speed: ${lvlConfig.speedLabel}` : '';
      hintBanner.textContent = `${lvlConfig.tip || 'Click to initiate reaction'}${starT}${speedBadge}`;
      hintBanner.classList.remove('hide');
    } else {
      hintBanner.classList.add('hide');
    }
  } else if (data.mode === 'endless') {
    hudLevelGroup.style.display = 'none';
    hudQuotaContainer.style.display = 'none';
    hudChargesValue.textContent = `${Math.round(data.endlessEnergy)}%`;
    hintBanner.textContent = data.endlessEnergy >= 100 ? 'Spark Ready! Click inside arena' : 'Recharging Spark...';
    hintBanner.classList.remove('hide');
  } else if (data.mode === 'chaos') {
    hudLevelGroup.style.display = 'none';
    hudQuotaContainer.style.display = 'none';
    hudChargesValue.textContent = `${data.chaosTimeLeft.toFixed(1)}s`;
    hintBanner.textContent = 'Keep the chain alive before time expires!';
    hintBanner.classList.remove('hide');
  } else if (data.mode === 'sandbox') {
    hudLevelGroup.style.display = 'none';
    hudQuotaContainer.style.display = 'none';
    hudChargesValue.textContent = '∞';
    hintBanner.textContent = 'Sandbox Lab: Click inside arena (Unlimited Triggers)';
    hintBanner.classList.remove('hide');
  }
}

// Render Level Top 10 Comparison Table in Scorecard
function renderLevelComparisonTable(comparison, playerTag = 'ACE') {
  levelLeaderboardTitle.textContent = `Level ${comparison.level} Top 10 (Global)`;
  levelTop10Rows.innerHTML = '';

  const { rank, qualifies, top10, score, combo } = comparison;

  if (rank === 1) {
    playerRankTag.className = 'player-rank-pill gold';
    playerRankTag.textContent = '👑 #1 ALL-TIME BEST!';
  } else if (qualifies) {
    playerRankTag.className = 'player-rank-pill cyan';
    playerRankTag.textContent = `⭐ Top 10 Rank: #${rank}`;
  } else {
    playerRankTag.className = 'player-rank-pill muted';
    playerRankTag.textContent = `Rank: #${rank} (Unranked)`;
  }

  // Create combined list showing placement
  const displayList = [...top10];
  const playerEntry = {
    name: playerTag,
    score,
    combo,
    isCurrentPlayer: true,
    rank
  };

  if (qualifies) {
    displayList.splice(rank - 1, 0, playerEntry);
    if (displayList.length > 10) displayList.pop();
  }

  displayList.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    const r = idx + 1;
    const isPlayer = entry.isCurrentPlayer;

    if (isPlayer) {
      tr.className = 'player-highlight-row';
    }

    let rankBadge = `${r}`;
    if (r === 1) rankBadge = `<span class="rank-badge gold">#1</span>`;
    else if (r === 2) rankBadge = `<span class="rank-badge silver">#2</span>`;
    else if (r === 3) rankBadge = `<span class="rank-badge bronze">#3</span>`;
    else rankBadge = `<span class="rank-badge other">#${r}</span>`;

    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td class="tag-cell ${isPlayer ? 'player-tag-glow' : ''}">${isPlayer ? `👉 ${entry.name}` : entry.name}</td>
      <td style="color: var(--accent-emerald); font-weight: 700;">x${entry.combo}</td>
      <td class="score-cell ${isPlayer ? 'player-score-glow' : ''}">${entry.score.toLocaleString()}${isPlayer ? ' ★' : ''}</td>
    `;
    levelTop10Rows.appendChild(tr);
  });

  if (!qualifies) {
    const sepRow = document.createElement('tr');
    sepRow.innerHTML = `<td colspan="4" class="divider-row">······</td>`;
    levelTop10Rows.appendChild(sepRow);

    const playerRow = document.createElement('tr');
    playerRow.className = 'player-highlight-row below-top10';
    playerRow.innerHTML = `
      <td><span class="rank-badge other">#${rank}</span></td>
      <td class="tag-cell player-tag-glow">👉 ${playerTag}</td>
      <td style="color: var(--accent-emerald); font-weight: 700;">x${combo}</td>
      <td class="score-cell player-score-glow">${score.toLocaleString()}</td>
    `;
    levelTop10Rows.appendChild(playerRow);
  }
}

async function handleLevelComplete(result) {
  modalResult.classList.add('show');
  
  if (result.success) {
    modalResultIcon.className = 'modal-icon-badge success';
    modalResultIcon.textContent = '✓';
    modalResultTitle.textContent = result.isFullWipe ? `100% Full Wipeout!` : `Level ${result.level} Cleared!`;
    modalResultDesc.textContent = result.isFullWipe 
      ? `Phenomenal! Cleared every geometry on screen!`
      : `Wiped out ${result.exploded} of ${result.total} geometries.`;
    
    let starsHtml = '';
    for (let i = 1; i <= 3; i++) {
      if (i <= result.stars) {
        starsHtml += '<span>★</span>';
      } else {
        starsHtml += '<span class="star-empty">★</span>';
      }
    }
    modalStarsContainer.innerHTML = starsHtml;
    modalStarsContainer.style.display = 'flex';

    if (result.speedMultiplier && parseFloat(result.speedMultiplier) > 1.0) {
      modalRowSpeed.style.display = 'flex';
      modalStatSpeed.textContent = `${result.timeTaken}s (${result.speedMultiplier}x Speed Bonus)`;
    } else {
      modalRowSpeed.style.display = 'none';
    }

    if (result.chargeBonus && result.chargeBonus > 0) {
      modalRowBonus.style.display = 'flex';
      modalStatBonus.textContent = `+${result.chargeBonus.toLocaleString()} (${result.chargesLeft} Spare Spark${result.chargesLeft > 1 ? 's' : ''})`;
    } else {
      modalRowBonus.style.display = 'none';
    }

    btnModalNext.style.display = result.hasNextLevel ? 'block' : 'none';
  } else {
    modalResultIcon.className = 'modal-icon-badge failure';
    modalResultIcon.textContent = '✕';
    modalResultTitle.textContent = `Level ${result.level} Incomplete`;
    modalResultDesc.textContent = `Target: ${result.target} bodies | Popped: ${result.exploded}.`;
    modalStarsContainer.style.display = 'none';
    modalRowSpeed.style.display = 'none';
    modalRowBonus.style.display = 'none';
    btnModalNext.style.display = 'none';
  }

  modalStatExploded.textContent = `${result.exploded} / ${result.total}`;
  modalStatScore.textContent = result.score.toLocaleString();
  modalStatBestCombo.textContent = `x${game.highestCombo}`;

  const savedTag = localStorage.getItem('cr_player_tag') || 'ACE';
  playerInitialsInput.value = savedTag;

  // 1. Render Local Level Top 10 Comparison immediately
  if (result.levelComparison) {
    renderLevelComparisonTable(result.levelComparison, savedTag);

    if (result.levelComparison.qualifies && result.success) {
      highScoreBanner.style.display = 'flex';
      highScoreText.textContent = `⭐ RANK #${result.levelComparison.rank} ON LEVEL ${result.level}! ⭐`;
      pendingHighScore = {
        level: result.level,
        score: result.score,
        combo: game.highestCombo
      };
    } else {
      highScoreBanner.style.display = 'none';
      pendingHighScore = null;
    }
  }

  // 2. Fetch Live Cloud Level Scores in background and refresh
  try {
    const cloudScores = await cloudLeaderboard.fetchLevelTop10(result.level);
    if (cloudScores && cloudScores.length > 0) {
      let rank = cloudScores.filter(item => item.score >= result.score).length + 1;
      const cloudComp = {
        level: result.level,
        score: result.score,
        combo: game.highestCombo,
        rank,
        qualifies: rank <= 10,
        top10: cloudScores
      };
      renderLevelComparisonTable(cloudComp, savedTag);
    }
  } catch (e) {
    console.warn(e);
  }
}

function handleChaosComplete(result) {
  modalResult.classList.add('show');
  modalResultIcon.className = 'modal-icon-badge success';
  modalResultIcon.textContent = '⚡';
  modalResultTitle.textContent = 'Chaos Run Finished!';
  modalResultDesc.textContent = `Cleared ${result.exploded} geometries before the silence.`;
  modalStarsContainer.style.display = 'none';
  modalRowSpeed.style.display = 'none';
  modalRowBonus.style.display = 'none';
  btnModalNext.style.display = 'none';

  modalStatExploded.textContent = `${result.exploded}`;
  modalStatScore.textContent = result.score.toLocaleString();
  modalStatBestCombo.textContent = `x${result.highestCombo}`;

  const savedTag = localStorage.getItem('cr_player_tag') || 'ACE';
  playerInitialsInput.value = savedTag;

  if (result.levelComparison) {
    renderLevelComparisonTable(result.levelComparison, savedTag);
    if (result.levelComparison.qualifies) {
      highScoreBanner.style.display = 'flex';
      highScoreText.textContent = `⭐ NEW CHAOS RECORD! (Rank #${result.levelComparison.rank}) ⭐`;
      pendingHighScore = {
        level: 'Chaos',
        score: result.score,
        combo: result.highestCombo
      };
    }
  }
}

function commitPendingHighScore() {
  if (pendingHighScore) {
    const rawTag = playerInitialsInput.value.trim().toUpperCase() || 'ACE';
    const tag = rawTag.substring(0, 4);
    localStorage.setItem('cr_player_tag', tag);
    game.addLevelHighScore(pendingHighScore.level, tag, pendingHighScore.score, pendingHighScore.combo);
    pendingHighScore = null;
  }
}

// Global Leaderboard Rendering with Cloud Synchronization
async function renderLeaderboard() {
  leaderboardRows.innerHTML = '';
  
  // 1. Render Local / Cached scores first for instant responsiveness
  let scores = game.highScores || [];
  if (currentLeaderboardFilter !== 'all') {
    scores = scores.filter(s => s.mode.toLowerCase() === currentLeaderboardFilter.toLowerCase());
  }

  const renderRows = (list) => {
    leaderboardRows.innerHTML = '';
    if (list.length === 0) {
      leaderboardRows.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No records found in this category yet.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      const rank = idx + 1;
      let rankBadge = `${rank}`;
      if (rank === 1) rankBadge = `<span class="rank-badge gold">#1</span>`;
      else if (rank === 2) rankBadge = `<span class="rank-badge silver">#2</span>`;
      else if (rank === 3) rankBadge = `<span class="rank-badge bronze">#3</span>`;
      else rankBadge = `<span class="rank-badge other">#${rank}</span>`;

      tr.innerHTML = `
        <td>${rankBadge}</td>
        <td class="tag-cell">${entry.name}</td>
        <td><span class="mode-tag ${(entry.mode || 'Campaign').toLowerCase()}">${entry.mode || 'Campaign'}</span></td>
        <td>${entry.mode === 'Campaign' ? `Lvl ${entry.level}` : '-'}</td>
        <td style="color: var(--accent-emerald); font-weight: 700;">x${entry.combo}</td>
        <td class="score-cell">${entry.score.toLocaleString()}</td>
      `;
      leaderboardRows.appendChild(tr);
    });
  };

  renderRows(scores);

  // 2. Fetch Live Global Cloud Records from Supabase
  try {
    const cloudScores = await cloudLeaderboard.fetchGlobalTop10(currentLeaderboardFilter);
    if (cloudScores && cloudScores.length > 0) {
      renderRows(cloudScores);
    }
  } catch (err) {
    console.warn('Cloud leaderboard refresh error:', err);
  }
}

function openLeaderboardModal() {
  renderLeaderboard();
  modalLeaderboard.classList.add('show');
}

function openLevelSelectModal() {
  levelsGrid.innerHTML = '';
  const unlocked = game.unlockedLevel;
  const starsMap = game.levelStars;

  CAMPAIGN_LEVELS.forEach((lvl, idx) => {
    const isUnlocked = lvl.level <= unlocked;
    const isCurrent = idx === game.currentLevelIndex;
    const stars = starsMap[lvl.level] || 0;

    const btn = document.createElement('button');
    btn.className = `level-card-btn ${!isUnlocked ? 'locked' : ''} ${isCurrent ? 'current' : ''}`;
    
    let starsDisplay = '';
    if (isUnlocked) {
      starsDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    } else {
      starsDisplay = '🔒';
    }

    btn.innerHTML = `
      <div class="level-num">${lvl.level}</div>
      <div class="level-stars-mini">${starsDisplay}</div>
      <div style="font-size: 0.62rem; color: var(--text-muted);">${lvl.speedLabel}</div>
    `;

    if (isUnlocked) {
      btn.addEventListener('click', () => {
        modalLevels.classList.remove('show');
        game.startCampaignLevel(idx);
      });
    }

    levelsGrid.appendChild(btn);
  });

  modalLevels.classList.add('show');
}

function renderSandboxChips() {
  particleChipsContainer.innerHTML = '';
  Object.values(PARTICLE_TYPES).forEach(type => {
    const chip = document.createElement('button');
    const isSelected = game.sandboxConfig.enabledTypes.includes(type.id);
    chip.className = `particle-chip-btn ${isSelected ? 'active' : ''}`;
    chip.textContent = type.name;
    chip.style.borderColor = isSelected ? type.color : '';

    chip.addEventListener('click', () => {
      const idx = game.sandboxConfig.enabledTypes.indexOf(type.id);
      if (idx > -1) {
        if (game.sandboxConfig.enabledTypes.length > 1) {
          game.sandboxConfig.enabledTypes.splice(idx, 1);
          chip.classList.remove('active');
          chip.style.borderColor = '';
        }
      } else {
        game.sandboxConfig.enabledTypes.push(type.id);
        chip.classList.add('active');
        chip.style.borderColor = type.color;
      }
    });

    particleChipsContainer.appendChild(chip);
  });
}

function setupEventListeners() {
  window.addEventListener('resize', handleResize);

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.triggerExplosion(x, y);
  });

  playerInitialsInput.addEventListener('input', (e) => {
    const newTag = e.target.value.toUpperCase();
    if (game.currentLevelIndex !== undefined) {
      const lvlNum = game.currentLevelIndex + 1;
      const comp = game.checkLevelComparison(lvlNum, game.score, game.highestCombo);
      renderLevelComparisonTable(comp, newTag || 'YOU');
    }
  });

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;

      sandboxTray.classList.remove('open');

      if (mode === 'campaign') {
        btnLevelSelect.style.display = 'flex';
        btnSandboxToggle.style.display = 'none';
        game.startCampaignLevel(game.currentLevelIndex);
      } else if (mode === 'endless') {
        btnLevelSelect.style.display = 'none';
        btnSandboxToggle.style.display = 'none';
        game.startEndlessMode();
      } else if (mode === 'chaos') {
        btnLevelSelect.style.display = 'none';
        btnSandboxToggle.style.display = 'none';
        game.startChaosMode();
      } else if (mode === 'sandbox') {
        btnLevelSelect.style.display = 'none';
        btnSandboxToggle.style.display = 'flex';
        sandboxTray.classList.add('open');
        game.startSandboxMode();
      }
    });
  });

  btnAudioToggle.addEventListener('click', () => {
    const muted = soundEngine.toggleMute();
    btnAudioToggle.innerHTML = muted ? '🔇' : '🔊';
  });

  btnLeaderboard.addEventListener('click', openLeaderboardModal);
  btnCloseLeaderboard.addEventListener('click', () => modalLeaderboard.classList.remove('show'));

  btnClearScores.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all high score records?')) {
      game.clearHighScores();
      renderLeaderboard();
    }
  });

  leaderboardFilterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      leaderboardFilterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentLeaderboardFilter = tab.dataset.filter;
      renderLeaderboard();
    });
  });

  btnLevelSelect.addEventListener('click', openLevelSelectModal);
  btnCloseLevels.addEventListener('click', () => modalLevels.classList.remove('show'));

  btnSandboxToggle.addEventListener('click', () => {
    sandboxTray.classList.toggle('open');
  });

  sliderCount.addEventListener('input', (e) => {
    valCount.textContent = e.target.value;
    game.sandboxConfig.particleCount = parseInt(e.target.value, 10);
  });
  sliderRadius.addEventListener('input', (e) => {
    valRadius.textContent = `${e.target.value}px`;
    game.sandboxConfig.baseRadius = parseInt(e.target.value, 10);
  });
  sliderDuration.addEventListener('input', (e) => {
    valDuration.textContent = `${parseFloat(e.target.value).toFixed(1)}s`;
    game.sandboxConfig.baseDuration = parseFloat(e.target.value);
  });
  sliderSpeed.addEventListener('input', (e) => {
    valSpeed.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    game.sandboxConfig.particleSpeed = parseFloat(e.target.value) * 1.5;
  });

  btnApplySandbox.addEventListener('click', () => {
    game.startSandboxMode();
  });

  btnRestart.addEventListener('click', () => {
    if (game.mode === 'campaign') {
      game.startCampaignLevel(game.currentLevelIndex);
    } else if (game.mode === 'endless') {
      game.startEndlessMode();
    } else if (game.mode === 'chaos') {
      game.startChaosMode();
    } else if (game.mode === 'sandbox') {
      game.startSandboxMode();
    }
  });

  btnModalRetry.addEventListener('click', () => {
    commitPendingHighScore();
    modalResult.classList.remove('show');
    if (game.mode === 'campaign') {
      game.startCampaignLevel(game.currentLevelIndex);
    } else if (game.mode === 'chaos') {
      game.startChaosMode();
    }
  });

  btnModalNext.addEventListener('click', () => {
    commitPendingHighScore();
    modalResult.classList.remove('show');
    game.startCampaignLevel(game.currentLevelIndex + 1);
  });

  btnModalLevels.addEventListener('click', () => {
    commitPendingHighScore();
    modalResult.classList.remove('show');
    openLevelSelectModal();
  });
}

window.addEventListener('DOMContentLoaded', init);
