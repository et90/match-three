/**
 * Main Controller for Match 3 Game
 * Handles UI interactions (Clicks, Drag & Swipe, Pointer events),
 * Smooth CSS animations, HUD synchronization, Authentication,
 * Level selection (Continue vs Start Over), and Leaderboards.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Game, Audio, Particles & Auth
  const game = new MatchThreeGame();
  const effectsCanvas = document.getElementById('effects-canvas');
  const particleEngine = new ParticleEngine(effectsCanvas);
  const audio = window.soundController;
  const auth = window.authManager;

  // DOM Elements - Header & HUD
  const boardFrame = document.getElementById('board-frame');
  const boardGrid = document.getElementById('board-grid');
  const levelNumberEl = document.getElementById('level-number');
  const backdropsLeftEl = document.getElementById('backdrops-left');
  const backdropsTotalEl = document.getElementById('backdrops-total');
  const progressBarEl = document.getElementById('progress-bar');
  const scoreValueEl = document.getElementById('score-value');
  const gridSizeBadgeEl = document.getElementById('grid-size-badge');
  const infoGridTextEl = document.getElementById('info-grid-text');
  const infoColorsTextEl = document.getElementById('info-colors-text');
  const hintMessageEl = document.getElementById('hint-message');
  const toastAlert = document.getElementById('toast-alert');
  const toastText = document.getElementById('toast-text');

  // User Profile Bar
  const btnUserProfile = document.getElementById('btn-user-profile');
  const userDisplayNameEl = document.getElementById('user-display-name');
  const userMaxLevelEl = document.getElementById('user-max-level');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnLevelMenu = document.getElementById('btn-level-menu');

  // Header Buttons
  const btnSound = document.getElementById('btn-sound');
  const soundOnIcon = btnSound.querySelector('.sound-on-icon');
  const soundOffIcon = btnSound.querySelector('.sound-off-icon');
  const btnRestart = document.getElementById('btn-restart');
  const btnRules = document.getElementById('btn-rules');
  const btnCloseRules = document.getElementById('btn-close-rules');
  const btnStartPlaying = document.getElementById('btn-start-playing');
  const btnNextLevel = document.getElementById('btn-next-level');

  // Modals
  const modalVictory = document.getElementById('modal-victory');
  const modalRules = document.getElementById('modal-rules');
  const modalLevelScore = document.getElementById('modal-level-score');
  const modalTotalScore = document.getElementById('modal-total-score');
  const modalNextGrid = document.getElementById('modal-next-grid');

  // Auth Modal Elements
  const modalAuth = document.getElementById('modal-auth');
  const btnCloseAuth = document.getElementById('btn-close-auth');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authModalTitle = document.getElementById('auth-modal-title');
  const authForm = document.getElementById('auth-form');
  const authUsernameInput = document.getElementById('auth-username');
  const authPasswordInput = document.getElementById('auth-password');
  const authStatusMsg = document.getElementById('auth-status-msg');
  const btnSubmitAuth = document.getElementById('btn-submit-auth');
  const btnPlayGuest = document.getElementById('btn-play-guest');
  const btnLogout = document.getElementById('btn-logout');
  let authMode = 'login'; // 'login' or 'register'

  // Level Selection Modal Elements
  const modalLevelSelect = document.getElementById('modal-level-select');
  const btnCloseLevelSelect = document.getElementById('btn-close-level-select');
  const continueLevelNum = document.getElementById('continue-level-num');
  const btnContinueGame = document.getElementById('btn-continue-game');
  const btnStartOver = document.getElementById('btn-start-over');
  const levelsContainer = document.getElementById('levels-container');

  // Leaderboard Modal Elements
  const modalLeaderboard = document.getElementById('modal-leaderboard');
  const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
  const leaderboardList = document.getElementById('leaderboard-list');
  const btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');

  // Backdrop Style Checkbox Toggle
  const toggleBackdropStyle = document.getElementById('toggle-backdrop-style');
  const targetTileIcon = document.getElementById('target-tile-icon');
  const appContainer = document.querySelector('.app-container');

  function updateBackdropStyle(isSolid) {
    if (isSolid) {
      toggleBackdropStyle.checked = true;
      targetTileIcon.classList.add('checked');
      appContainer.setAttribute('data-backdrop-style', 'solid');
      localStorage.setItem('match3_backdrop_style', 'solid');
    } else {
      toggleBackdropStyle.checked = false;
      targetTileIcon.classList.remove('checked');
      appContainer.setAttribute('data-backdrop-style', 'frame');
      localStorage.setItem('match3_backdrop_style', 'frame');
    }
  }

  function initBackdropStyle() {
    const savedStyle = localStorage.getItem('match3_backdrop_style') || 'frame'; // default is frame (no checkmark)
    updateBackdropStyle(savedStyle === 'solid');
  }

  toggleBackdropStyle.addEventListener('change', () => {
    audio.playClick();
    updateBackdropStyle(toggleBackdropStyle.checked);
  });

  initBackdropStyle();

  // Interaction State
  let selectedCell = null; // { r, c, el }
  let pointerStart = null;  // { x, y, r, c }
  let hintTimeoutId = null;
  let activeHintCells = [];

  // Helper Delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Initialize Audio UI state
  function updateSoundUI() {
    if (audio.muted) {
      soundOnIcon.style.display = 'none';
      soundOffIcon.style.display = 'block';
    } else {
      soundOnIcon.style.display = 'block';
      soundOffIcon.style.display = 'none';
    }
  }
  updateSoundUI();

  btnSound.addEventListener('click', () => {
    const muted = audio.toggleMute();
    updateSoundUI();
  });

  // Update User Profile Bar in HUD
  function updateUserProfileUI() {
    const u = auth.currentUser;
    if (!u || u.isGuest) {
      userDisplayNameEl.textContent = 'Гость';
      userMaxLevelEl.textContent = `Макс. ур: ${u ? u.games : 1}`;
      btnLogout.style.display = 'none';
      btnPlayGuest.style.display = 'flex';
    } else {
      userDisplayNameEl.textContent = u.user;
      userMaxLevelEl.textContent = `Макс. ур: ${u.games}`;
      btnLogout.style.display = 'flex';
      btnPlayGuest.style.display = 'none';
    }
  }
  updateUserProfileUI();

  // Calculate & Set Responsive Cell Sizing for any screen, mobile, or 1000x800 iframe up to 13x13
  function updateBoardDimensions() {
    const appEl = document.querySelector('.app-container');
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const appW = appEl ? Math.min(appEl.clientWidth || winW, winW) : winW;
    const appH = appEl ? Math.min(appEl.clientHeight || winH, winH) : winH;

    const headerEl = document.querySelector('.game-header');
    const userBarEl = document.querySelector('.user-bar');
    const statsEl = document.querySelector('.stats-panel');
    const subInfoEl = document.querySelector('.level-info-sub');
    const footerEl = document.querySelector('.game-footer');

    const topHeight = (userBarEl ? userBarEl.offsetHeight : 34) +
                      (headerEl ? headerEl.offsetHeight : 48) +
                      (statsEl ? statsEl.offsetHeight : 60) +
                      (subInfoEl ? subInfoEl.offsetHeight : 20);
    const bottomHeight = footerEl ? footerEl.offsetHeight : 24;

    // Available space inside app-container for the board
    const availableWidth = Math.max(appW - 36, 160);
    const availableHeight = Math.max(appH - topHeight - bottomHeight - 28, 160);

    // Gap scaling based on grid density
    let gap = 7;
    if (game.cols >= 11) gap = 3;
    else if (game.cols >= 7) gap = 4;
    else if (game.cols >= 5) gap = 5;

    // Calculate maximum cell size that fits both horizontally and vertically
    const maxCellW = Math.floor((availableWidth - (game.cols - 1) * gap - 16) / game.cols);
    const maxCellH = Math.floor((availableHeight - (game.rows - 1) * gap - 16) / game.rows);
    let cellSize = Math.min(maxCellW, maxCellH, 70);
    cellSize = Math.max(cellSize, 16);

    const cellRadius = Math.max(Math.floor(cellSize * 0.22), 3);

    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
    document.documentElement.style.setProperty('--gap-size', `${gap}px`);
    document.documentElement.style.setProperty('--cell-radius', `${cellRadius}px`);

    boardGrid.style.gridTemplateColumns = `repeat(${game.cols}, var(--cell-size))`;
    boardGrid.style.gridTemplateRows = `repeat(${game.rows}, var(--cell-size))`;

    setTimeout(() => particleEngine.resize(), 50);
  }

  window.addEventListener('resize', () => {
    updateBoardDimensions();
  });

  // Start Level
  function startLevel(lvl = 1) {
    clearHint();
    selectedCell = null;
    pointerStart = null;
    game.isProcessing = false;
    game.initLevel(lvl);
    boardGrid.innerHTML = '';
    updateBoardDimensions();
    renderBoard();
    updateHUD();
    resetHintTimer();
  }

  // Update HUD elements
  function updateHUD() {
    levelNumberEl.textContent = game.level;
    const remaining = game.getRemainingBackdropsCount();
    const total = game.getTotalBackdropsCount();
    
    backdropsLeftEl.textContent = remaining;
    backdropsTotalEl.textContent = total;
    
    const percent = Math.round(((total - remaining) / total) * 100);
    progressBarEl.style.width = `${percent}%`;

    scoreValueEl.textContent = game.score;
    gridSizeBadgeEl.textContent = `${game.cols}×${game.rows}`;
    infoGridTextEl.textContent = `Поле: ${game.cols}×${game.rows}`;
    infoColorsTextEl.textContent = `Цветов: ${game.colorCount}`;
  }

  // Render Full Board DOM
  function renderBoard() {
    boardGrid.innerHTML = '';
    selectedCell = null;

    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Backdrop Plate
        const backdrop = document.createElement('div');
        backdrop.className = `cell-backdrop ${game.backdrops[r][c] ? 'active' : 'cleared'}`;
        backdrop.id = `backdrop-${r}-${c}`;
        cell.appendChild(backdrop);

        // Chip Element
        const chipData = game.grid[r][c];
        if (chipData) {
          const chip = createChipElement(chipData.color, chipData.id);
          cell.appendChild(chip);
        }

        // Pointer / Touch / Click Events
        setupCellInteraction(cell, r, c);

        boardGrid.appendChild(cell);
      }
    }
  }

  // Create single Chip DOM element
  function createChipElement(colorIndex, id) {
    const chip = document.createElement('div');
    chip.className = `chip chip-${colorIndex}`;
    chip.dataset.color = colorIndex;
    chip.dataset.id = id;
    chip.innerHTML = game.chipIcons[colorIndex] || '';
    return chip;
  }

  // Setup interactions (both click and swipe/drag)
  function setupCellInteraction(cell, r, c) {
    // Pointer down for swipe
    cell.addEventListener('pointerdown', (e) => {
      if (game.isProcessing) return;
      audio.ensureContext();
      clearHint();
      pointerStart = {
        x: e.clientX,
        y: e.clientY,
        r: r,
        c: c
      };
      try {
        cell.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    // Pointer move to detect directional swipe
    cell.addEventListener('pointermove', (e) => {
      if (!pointerStart || game.isProcessing) return;
      const dx = e.clientX - pointerStart.x;
      const dy = e.clientY - pointerStart.y;
      const threshold = 22; // px

      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        let targetR = pointerStart.r;
        let targetC = pointerStart.c;

        if (Math.abs(dx) > Math.abs(dy)) {
          targetC += dx > 0 ? 1 : -1;
        } else {
          targetR += dy > 0 ? 1 : -1;
        }

        const startR = pointerStart.r;
        const startC = pointerStart.c;
        pointerStart = null; // consume swipe
        
        try {
          cell.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (targetR >= 0 && targetR < game.rows && targetC >= 0 && targetC < game.cols) {
          executeSwapAttempt(startR, startC, targetR, targetC);
        }
      }
    });

    cell.addEventListener('pointerup', (e) => {
      if (pointerStart) {
        handleCellClick(r, c);
        pointerStart = null;
      }
    });

    cell.addEventListener('pointercancel', () => {
      pointerStart = null;
    });
  }

  // Handle cell click selection & neighbor swap
  function handleCellClick(r, c) {
    if (game.isProcessing) return;
    clearHint();
    const cellEl = getCellElement(r, c);
    const chipEl = cellEl ? cellEl.querySelector('.chip') : null;

    if (!selectedCell) {
      if (chipEl) {
        selectedCell = { r, c, el: chipEl };
        chipEl.classList.add('selected');
        audio.playClick();
      }
    } else {
      const prevR = selectedCell.r;
      const prevC = selectedCell.c;
      const prevEl = selectedCell.el;

      if (prevR === r && prevC === c) {
        // Deselect current
        prevEl.classList.remove('selected');
        selectedCell = null;
        audio.playClick();
      } else if (game.isAdjacent(prevR, prevC, r, c)) {
        // Swap adjacent
        prevEl.classList.remove('selected');
        const startR = prevR;
        const startC = prevC;
        selectedCell = null;
        executeSwapAttempt(startR, startC, r, c);
      } else {
        // Select new different chip
        prevEl.classList.remove('selected');
        if (chipEl) {
          selectedCell = { r, c, el: chipEl };
          chipEl.classList.add('selected');
          audio.playClick();
        } else {
          selectedCell = null;
        }
      }
    }
  }

  // Helper to find DOM cell
  function getCellElement(r, c) {
    return boardGrid.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
  }

  // Get Center Coordinates of a cell relative to canvas
  function getCellCenter(r, c) {
    const cellEl = getCellElement(r, c);
    if (!cellEl) return { x: 0, y: 0 };
    const boardRect = effectsCanvas.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    return {
      x: cellRect.left - boardRect.left + cellRect.width / 2,
      y: cellRect.top - boardRect.top + cellRect.height / 2
    };
  }

  // Execute swap attempt with visual animation and validation
  async function executeSwapAttempt(r1, c1, r2, c2) {
    if (game.isProcessing) return;
    game.isProcessing = true;
    clearHint();

    try {
      const cell1 = getCellElement(r1, c1);
      const cell2 = getCellElement(r2, c2);
      const chip1 = cell1 ? cell1.querySelector('.chip') : null;
      const chip2 = cell2 ? cell2.querySelector('.chip') : null;

      if (!chip1 || !chip2) {
        game.isProcessing = false;
        return;
      }

      // Calculate visual offset for smooth translation
      const rect1 = cell1.getBoundingClientRect();
      const rect2 = cell2.getBoundingClientRect();
      const deltaX = rect2.left - rect1.left;
      const deltaY = rect2.top - rect1.top;

      audio.playSwap();

      // Animate swap slide
      chip1.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)';
      chip2.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)';
      chip1.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      chip2.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;

      await delay(220);

      // Check if swap produces matches
      const hasMatch = game.testSwap(r1, c1, r2, c2);

      if (hasMatch) {
        // Commit swap in data
        game.swapGrid(r1, c1, r2, c2);
        game.moves++;

        // Swap in DOM
        chip1.style.transition = '';
        chip1.style.transform = '';
        chip2.style.transition = '';
        chip2.style.transform = '';
        cell1.appendChild(chip2);
        cell2.appendChild(chip1);

        // Start cascade resolution
        game.combo = 1;
        await resolveBoardCascades();
      } else {
        // Invalid swap: animate back and shake
        audio.playInvalidSwap();
        chip1.style.transform = `translate(0px, 0px)`;
        chip2.style.transform = `translate(0px, 0px)`;
        await delay(200);

        chip1.style.transition = '';
        chip1.style.transform = '';
        chip2.style.transition = '';
        chip2.style.transform = '';

        chip1.classList.add('invalid-shake');
        chip2.classList.add('invalid-shake');
        await delay(350);
        chip1.classList.remove('invalid-shake');
        chip2.classList.remove('invalid-shake');

        game.isProcessing = false;
        resetHintTimer();
      }
    } catch (err) {
      console.error('Error during swap attempt:', err);
      game.isProcessing = false;
      resetHintTimer();
    }
  }

  // Cascading match resolution loop (Matches -> Clear Backdrops -> Gravity -> Re-check)
  async function resolveBoardCascades() {
    let cascadeCount = 0;

    while (true) {
      const matchResult = game.findMatches();
      const matchedSet = matchResult.matchedCells;

      if (matchedSet.size === 0) {
        break; // No more matches, cascades settled
      }

      cascadeCount++;
      const isSuperClear = matchResult.clearedRows.length > 0 || matchResult.clearedCols.length > 0;

      // 1. Play sounds and Laser Effects
      if (isSuperClear) {
        audio.playLineClear();

        // Emit Laser beams for cleared rows
        for (const rowIdx of matchResult.clearedRows) {
          const startPt = getCellCenter(rowIdx, 0);
          particleEngine.emitLaser('row', rowIdx, 0, startPt.y, effectsCanvas.width, startPt.y);
          particleEngine.emitFloatingText('РЯД ОЧИЩЕН!', effectsCanvas.width * 0.5, startPt.y, '#38bdf8', 24);
        }

        // Emit Laser beams for cleared columns
        for (const colIdx of matchResult.clearedCols) {
          const startPt = getCellCenter(0, colIdx);
          particleEngine.emitLaser('col', colIdx, startPt.x, 0, startPt.x, effectsCanvas.height);
          particleEngine.emitFloatingText('СТОЛБЕЦ ОЧИЩЕН!', startPt.x, effectsCanvas.height * 0.5, '#38bdf8', 24);
        }
      } else {
        audio.playMatch(game.combo);
        if (game.combo > 1) {
          const firstMatched = Array.from(matchedSet)[0].split(',').map(Number);
          const pt = getCellCenter(firstMatched[0], firstMatched[1]);
          particleEngine.emitFloatingText(`КОМБО x${game.combo}!`, pt.x, pt.y, '#f59e0b', 22);
        }
      }

      // 2. Animate destroying chips and particles
      for (const key of matchedSet) {
        const [r, c] = key.split(',').map(Number);
        const cell = getCellElement(r, c);
        const chip = cell ? cell.querySelector('.chip') : null;
        if (chip && !chip.classList.contains('destroying')) {
          chip.classList.add('destroying');
          const pt = getCellCenter(r, c);
          const colorIdx = game.grid[r][c] ? game.grid[r][c].color : 0;
          particleEngine.emitChipExplosion(pt.x, pt.y, colorIdx);
        }
      }

      // 3. Clear Backdrops
      const newlyCleared = game.clearBackdrops(matchedSet);
      if (newlyCleared.length > 0) {
        audio.playTileBreak();
        for (const pos of newlyCleared) {
          const backdropEl = document.getElementById(`backdrop-${pos.r}-${pos.c}`);
          if (backdropEl) {
            backdropEl.classList.add('breaking');
            setTimeout(() => {
              backdropEl.classList.remove('active', 'breaking');
              backdropEl.classList.add('cleared');
            }, 300);
          }
          const pt = getCellCenter(pos.r, pos.c);
          particleEngine.emitBackdropShatter(pt.x, pt.y);
        }
      }

      // 4. Calculate Score
      const basePoints = matchedSet.size * 50;
      const comboMultiplier = game.combo;
      const superBonus = isSuperClear ? 300 : 0;
      const gainedScore = (basePoints + superBonus) * comboMultiplier;
      game.score += gainedScore;
      game.levelScore += gainedScore;

      updateHUD();
      await delay(320);

      // 5. Remove destroyed chips from DOM and grid
      for (const key of matchedSet) {
        const [r, c] = key.split(',').map(Number);
        const cell = getCellElement(r, c);
        if (cell) {
          const chip = cell.querySelector('.chip');
          if (chip) chip.remove();
        }
        game.grid[r][c] = null;
      }

      // 6. Apply Gravity and Spawn new chips
      const movements = game.applyGravity();
      
      // Update DOM with new chips and animate falling
      for (const m of movements) {
        const targetCell = getCellElement(m.toR, m.toC);
        if (!targetCell) continue;

        if (m.isNew) {
          const newChipEl = createChipElement(m.chip.color, m.chip.id);
          newChipEl.classList.add('spawning');
          targetCell.appendChild(newChipEl);
        } else {
          // Existing falling chip - locate by unique ID
          const existingChip = boardGrid.querySelector(`[data-id="${m.chip.id}"]`);
          if (existingChip) {
            targetCell.appendChild(existingChip);
            existingChip.style.animation = 'chipSpawn 0.3s ease-out';
          }
        }
      }

      await delay(300);

      // Check if level completed during cascade
      if (game.isLevelComplete()) {
        break;
      }

      game.combo++;
    }

    // Cascade finished, check state
    if (game.isLevelComplete()) {
      game.isProcessing = false;
      handleLevelVictory();
    } else {
      // Check if board has valid moves
      if (!game.hasValidMoves()) {
        await handleNoMovesReshuffle();
      }
      game.isProcessing = false;
      resetHintTimer();
    }
  }

  // Handle Level Victory
  function handleLevelVictory() {
    audio.playLevelWin();
    particleEngine.emitVictoryConfetti();

    // Update player's max unlocked level
    const nextLevelNum = Math.min(game.level + 1, 21);
    auth.updateMaxLevel(nextLevelNum);
    updateUserProfileUI();

    modalLevelScore.textContent = `+${game.levelScore}`;
    modalTotalScore.textContent = game.score;

    if (game.level >= 21) {
      modalNextGrid.textContent = '🏆 Все 21 уровень пройдены!';
      btnNextLevel.querySelector('span').textContent = 'Играть заново';
    } else {
      const nextConfig = game.getLevelConfig(game.level + 1);
      modalNextGrid.textContent = `${nextConfig.cols}×${nextConfig.rows} (${nextConfig.colorCount} цветов)`;
      btnNextLevel.querySelector('span').textContent = 'Следующий уровень';
    }

    setTimeout(() => {
      modalVictory.classList.add('open');
    }, 300);
  }

  // Handle Automatic Reshuffle when no moves are possible
  async function handleNoMovesReshuffle() {
    toastText.textContent = 'Нет ходов! Перемешиваем...';
    toastAlert.classList.add('show');
    audio.playShuffle();

    await delay(1200);

    game.shuffleBoard();
    renderBoard();

    toastAlert.classList.remove('show');
    await delay(300);
  }

  // Next Level button
  btnNextLevel.addEventListener('click', () => {
    audio.playClick();
    modalVictory.classList.remove('open');
    if (game.level >= 21) {
      startLevel(1);
    } else {
      startLevel(game.level + 1);
    }
  });

  // Restart Current Level
  btnRestart.addEventListener('click', () => {
    audio.playClick();
    startLevel(game.level);
  });

  // Rules Modal
  btnRules.addEventListener('click', () => {
    audio.playClick();
    modalRules.classList.add('open');
  });

  btnCloseRules.addEventListener('click', () => {
    audio.playClick();
    modalRules.classList.remove('open');
  });

  btnStartPlaying.addEventListener('click', () => {
    audio.playClick();
    modalRules.classList.remove('open');
  });

  // ==========================================
  // Auth Modal & Handlers
  // ==========================================
  function setAuthMode(mode) {
    authMode = mode;
    authStatusMsg.textContent = '';
    authStatusMsg.className = 'auth-status-msg';

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      authModalTitle.textContent = 'Авторизация';
      btnSubmitAuth.textContent = 'Войти';
    } else {
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
      authModalTitle.textContent = 'Регистрация';
      btnSubmitAuth.textContent = 'Зарегистрироваться';
    }
  }

  btnUserProfile.addEventListener('click', () => {
    audio.playClick();
    setAuthMode('login');
    modalAuth.classList.add('open');
  });

  btnCloseAuth.addEventListener('click', () => {
    audio.playClick();
    modalAuth.classList.remove('open');
  });

  tabLogin.addEventListener('click', () => {
    audio.playClick();
    setAuthMode('login');
  });

  tabRegister.addEventListener('click', () => {
    audio.playClick();
    setAuthMode('register');
  });

  // Auth Form Submit (Login or Register)
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    audio.playClick();

    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!username || !password) {
      authStatusMsg.textContent = 'Заполните логин и пароль!';
      authStatusMsg.className = 'auth-status-msg error';
      return;
    }

    btnSubmitAuth.disabled = true;
    authStatusMsg.textContent = 'Отправка данных...';
    authStatusMsg.className = 'auth-status-msg';

    try {
      if (authMode === 'login') {
        await auth.login(username, password);
        authStatusMsg.textContent = 'Успешный вход!';
        authStatusMsg.className = 'auth-status-msg success';
      } else {
        await auth.register(username, password);
        authStatusMsg.textContent = 'Регистрация успешна!';
        authStatusMsg.className = 'auth-status-msg success';
      }

      updateUserProfileUI();
      authPasswordInput.value = '';

      setTimeout(() => {
        modalAuth.classList.remove('open');
        btnSubmitAuth.disabled = false;
        openLevelSelectModal();
      }, 700);
    } catch (err) {
      btnSubmitAuth.disabled = false;
      authStatusMsg.textContent = err.message || 'Ошибка сервера';
      authStatusMsg.className = 'auth-status-msg error';
    }
  });

  // Play as Guest button
  btnPlayGuest.addEventListener('click', () => {
    audio.playClick();
    auth.playAsGuest();
    updateUserProfileUI();
    modalAuth.classList.remove('open');
  });

  // Logout button
  btnLogout.addEventListener('click', () => {
    audio.playClick();
    auth.logout();
    updateUserProfileUI();
    authStatusMsg.textContent = 'Вы вышли из аккаунта';
    authStatusMsg.className = 'auth-status-msg success';
    setTimeout(() => {
      modalAuth.classList.remove('open');
    }, 600);
  });

  // ==========================================
  // Level Selection (Continue vs Start Over)
  // ==========================================
  function openLevelSelectModal() {
    const maxLevel = auth.currentUser ? auth.currentUser.games : 1;
    continueLevelNum.textContent = maxLevel;

    // Render level buttons (All 21 levels up to 13x13)
    levelsContainer.innerHTML = '';
    const TOTAL_LEVELS = 21;

    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const btn = document.createElement('button');
      btn.className = 'level-pick-btn';

      if (i <= maxLevel) {
        btn.classList.add('unlocked');
        btn.textContent = i;
        if (i === game.level) {
          btn.classList.add('current');
        }
        btn.addEventListener('click', () => {
          audio.playClick();
          modalLevelSelect.classList.remove('open');
          startLevel(i);
        });
      } else {
        btn.classList.add('locked');
        btn.innerHTML = `<span style="font-size:0.75rem; opacity:0.6;">🔒 ${i}</span>`;
      }
      levelsContainer.appendChild(btn);
    }

    modalLevelSelect.classList.add('open');
  }

  btnLevelMenu.addEventListener('click', () => {
    audio.playClick();
    openLevelSelectModal();
  });

  btnCloseLevelSelect.addEventListener('click', () => {
    audio.playClick();
    modalLevelSelect.classList.remove('open');
  });

  btnContinueGame.addEventListener('click', () => {
    audio.playClick();
    modalLevelSelect.classList.remove('open');
    const maxLevel = auth.currentUser ? auth.currentUser.games : 1;
    startLevel(maxLevel);
  });

  btnStartOver.addEventListener('click', () => {
    audio.playClick();
    modalLevelSelect.classList.remove('open');
    game.score = 0; // reset score on fresh start
    startLevel(1);
  });

  // ==========================================
  // Leaderboard Modal
  // ==========================================
  async function loadLeaderboard() {
    leaderboardList.innerHTML = '<div class="leaderboard-loading">Загрузка рекордов...</div>';

    try {
      const leaders = await auth.fetchLeaderboard();
      if (!leaders || leaders.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-empty">Пока нет зарегистрированных игроков. Станьте первым!</div>';
        return;
      }

      leaderboardList.innerHTML = '';
      leaders.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = `leaderboard-item rank-${index + 1}`;

        const isCurrent = auth.currentUser && !auth.isGuest && auth.currentUser.user === item.user;
        if (isCurrent) {
          row.classList.add('is-me');
        }

        let rankBadge = `${index + 1}`;
        if (index === 0) rankBadge = '🥇';
        else if (index === 1) rankBadge = '🥈';
        else if (index === 2) rankBadge = '🥉';

        row.innerHTML = `
          <span class="col-rank">${rankBadge}</span>
          <span class="col-user">${escapeHtml(item.user)}${isCurrent ? ' <em style="color:#38bdf8; font-size:0.8rem;">(Вы)</em>' : ''}</span>
          <span class="col-games">Уровень ${item.games}</span>
        `;

        leaderboardList.appendChild(row);
      });
    } catch (err) {
      leaderboardList.innerHTML = `
        <div class="leaderboard-empty" style="color:#f87171;">
          ⚠️ ${err.message}<br>
          <small style="color:#94a3b8; display:block; margin-top:6px;">Запустите <code>node serverAuth.js</code> для подключения к MySQL базе данных.</small>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  btnLeaderboard.addEventListener('click', () => {
    audio.playClick();
    modalLeaderboard.classList.add('open');
    loadLeaderboard();
  });

  btnCloseLeaderboard.addEventListener('click', () => {
    audio.playClick();
    modalLeaderboard.classList.remove('open');
  });

  btnRefreshLeaderboard.addEventListener('click', () => {
    audio.playClick();
    loadLeaderboard();
  });

  // ==========================================
  // Hint System
  // ==========================================
  function resetHintTimer() {
    clearHint();
    hintTimeoutId = setTimeout(() => {
      showHint();
    }, 5000); // 5 seconds idle
  }

  function clearHint() {
    if (hintTimeoutId) clearTimeout(hintTimeoutId);
    activeHintCells.forEach(el => el.classList.remove('hint-highlight'));
    activeHintCells = [];
  }

  function showHint() {
    if (game.isProcessing) return;
    const moves = game.getPossibleMoves();
    if (moves.length === 0) return;

    const move = moves[Math.floor(Math.random() * moves.length)];
    const cell1 = getCellElement(move.from.r, move.from.c);
    const cell2 = getCellElement(move.to.r, move.to.c);
    const chip1 = cell1 ? cell1.querySelector('.chip') : null;
    const chip2 = cell2 ? cell2.querySelector('.chip') : null;

    if (chip1 && chip2) {
      chip1.classList.add('hint-highlight');
      chip2.classList.add('hint-highlight');
      activeHintCells = [chip1, chip2];
    }
  }

  // Initialize Game on start
  startLevel(1);
});
