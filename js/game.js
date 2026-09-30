/**
 * Match 3 Game Engine
 * Handles board state, match detection (3-in-a-row, 4-in-a-row line clear),
 * gravity/cascades, backdrops tracking, and level configuration.
 */

class MatchThreeGame {
  constructor() {
    this.level = 1;
    this.rows = 3;
    this.cols = 3;
    this.colorCount = 3;
    this.grid = []; // 2D array of { id, color, special }
    this.backdrops = []; // 2D array of boolean (true = active, false = cleared)
    this.score = 0;
    this.levelScore = 0;
    this.moves = 0;
    this.combo = 0;
    this.isProcessing = false;
    this.nextChipId = 1;

    // SVG icons for chips (different symbols for color-blind accessibility & visual richness)
    this.chipIcons = [
      // 0: Ruby Star / Hexagon
      '<svg class="chip-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      // 1: Emerald Circle
      '<svg class="chip-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
      // 2: Sapphire Diamond
      '<svg class="chip-icon" viewBox="0 0 24 24"><polygon points="12 2 22 12 12 22 2 12"/></svg>',
      // 3: Amber Sun / Square
      '<svg class="chip-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/></svg>',
      // 4: Amethyst Triangle
      '<svg class="chip-icon" viewBox="0 0 24 24"><polygon points="12 3 22 20 2 20"/></svg>',
      // 5: Cyan Teardrop / Leaf
      '<svg class="chip-icon" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
      // 6: Pink Heart
      '<svg class="chip-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
      // 7: Orange Flame / Shield
      '<svg class="chip-icon" viewBox="0 0 24 24"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>'
    ];
  }

  // Calculate grid size and color count for given level
  // Level 1: 3x3, 3 colors
  // Level 2: 4x3, 3 colors
  // ...
  // Level 21: 13x13, 8 colors (MAX LEVEL)
  getLevelConfig(lvl = this.level) {
    const MAX_GRID = 13;
    const MAX_LEVEL = 21; // Level 21 is 13x13
    const clampedLevel = Math.min(Math.max(lvl, 1), MAX_LEVEL);

    const base = 3 + Math.floor((clampedLevel - 1) / 2);
    const isOddStep = (clampedLevel - 1) % 2 === 1;
    
    let cols = isOddStep ? base + 1 : base;
    let rows = base;

    // Cap at 13x13
    cols = Math.min(cols, MAX_GRID);
    rows = Math.min(rows, MAX_GRID);
    
    // Number of colors increases when width === height up to 8 colors
    const colorCount = Math.min(base, 8);

    const isMaxLevel = (lvl >= MAX_LEVEL);

    return { rows, cols, colorCount, isMaxLevel, maxLevelNum: MAX_LEVEL };
  }

  // Initialize a new level
  initLevel(lvl = 1) {
    this.level = lvl;
    this.isProcessing = false;
    const config = this.getLevelConfig(lvl);
    this.rows = config.rows;
    this.cols = config.cols;
    this.colorCount = config.colorCount;
    this.levelScore = 0;
    this.moves = 0;
    this.combo = 0;

    // Initialize all backdrops as active (true)
    this.backdrops = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(true); // active backdrop
      }
      this.backdrops.push(row);
    }

    // Generate balanced initial board without starting matches
    this.generateInitialBoard();
  }

  // Total active backdrops remaining
  getRemainingBackdropsCount() {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.backdrops[r][c]) count++;
      }
    }
    return count;
  }

  getTotalBackdropsCount() {
    return this.rows * this.cols;
  }

  isLevelComplete() {
    return this.getRemainingBackdropsCount() === 0;
  }

  // Random color index for new chips
  getRandomColor() {
    return Math.floor(Math.random() * this.colorCount);
  }

  // Generate initial grid with no matches and at least one valid move
  generateInitialBoard() {
    let attempts = 0;
    do {
      this.grid = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) {
          let forbiddenColors = [];
          // Avoid 3 in horizontal row
          if (c >= 2 && row[c - 1].color === row[c - 2].color) {
            forbiddenColors.push(row[c - 1].color);
          }
          // Avoid 3 in vertical col
          if (r >= 2 && this.grid[r - 1][c].color === this.grid[r - 2][c].color) {
            forbiddenColors.push(this.grid[r - 1][c].color);
          }

          let availableColors = [];
          for (let colIndex = 0; colIndex < this.colorCount; colIndex++) {
            if (!forbiddenColors.includes(colIndex)) {
              availableColors.push(colIndex);
            }
          }
          if (availableColors.length === 0) {
            availableColors = [this.getRandomColor()];
          }

          const color = availableColors[Math.floor(Math.random() * availableColors.length)];
          row.push({
            id: this.nextChipId++,
            color: color
          });
        }
        this.grid.push(row);
      }
      attempts++;
    } while ((this.findMatches().matchedCells.size > 0 || !this.hasValidMoves()) && attempts < 100);
  }

  // Check if two cells are adjacent
  isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  // Swap two chips in the grid data
  swapGrid(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
  }

  // Test if swapping two cells results in at least one match
  testSwap(r1, c1, r2, c2) {
    if (!this.isAdjacent(r1, c1, r2, c2)) return false;
    this.swapGrid(r1, c1, r2, c2);
    const matches = this.findMatches();
    this.swapGrid(r1, c1, r2, c2);
    return matches.matchedCells.size > 0;
  }

  // Find all matches on current board:
  // - 3 in a row/col: clears matched cells and their backdrops
  // - 4 in a row: clears whole row and all row backdrops!
  // - 4 in a col: clears whole col and all col backdrops!
  findMatches() {
    const matchedCells = new Set(); // Strings "r,c"
    const clearedRows = new Set();  // Set of row indices
    const clearedCols = new Set();  // Set of col indices
    const matchGroups = [];         // List of { type: 'horizontal'|'vertical', cells: [{r,c}], length, color }

    // 1. Horizontal check
    for (let r = 0; r < this.rows; r++) {
      let matchLen = 1;
      for (let c = 0; c < this.cols; c++) {
        const isSame = (c < this.cols - 1) && 
                       this.grid[r][c] && this.grid[r][c + 1] && 
                       (this.grid[r][c].color === this.grid[r][c + 1].color);
        if (isSame) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            const startCol = c - matchLen + 1;
            const cells = [];
            for (let k = 0; k < matchLen; k++) {
              cells.push({ r, c: startCol + k });
            }
            matchGroups.push({
              type: 'horizontal',
              row: r,
              length: matchLen,
              color: this.grid[r][startCol].color,
              cells
            });

            if (matchLen >= 4) {
              // 4 in a row -> clear entire row!
              clearedRows.add(r);
            } else {
              // 3 in a row -> add cells
              cells.forEach(pos => matchedCells.add(`${pos.r},${pos.c}`));
            }
          }
          matchLen = 1;
        }
      }
    }

    // 2. Vertical check
    for (let c = 0; c < this.cols; c++) {
      let matchLen = 1;
      for (let r = 0; r < this.rows; r++) {
        const isSame = (r < this.rows - 1) && 
                       this.grid[r][c] && this.grid[r + 1][c] && 
                       (this.grid[r][c].color === this.grid[r + 1][c].color);
        if (isSame) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            const startRow = r - matchLen + 1;
            const cells = [];
            for (let k = 0; k < matchLen; k++) {
              cells.push({ r: startRow + k, c });
            }
            matchGroups.push({
              type: 'vertical',
              col: c,
              length: matchLen,
              color: this.grid[startRow][c].color,
              cells
            });

            if (matchLen >= 4) {
              // 4 in a col -> clear entire column!
              clearedCols.add(c);
            } else {
              // 3 in a col -> add cells
              cells.forEach(pos => matchedCells.add(`${pos.r},${pos.c}`));
            }
          }
          matchLen = 1;
        }
      }
    }

    // Expand cleared rows to matchedCells
    for (const r of clearedRows) {
      for (let c = 0; c < this.cols; c++) {
        matchedCells.add(`${r},${c}`);
      }
    }

    // Expand cleared cols to matchedCells
    for (const c of clearedCols) {
      for (let r = 0; r < this.rows; r++) {
        matchedCells.add(`${r},${c}`);
      }
    }

    return {
      matchedCells,
      clearedRows: Array.from(clearedRows),
      clearedCols: Array.from(clearedCols),
      matchGroups
    };
  }

  // Check if any valid moves exist on the board
  hasValidMoves() {
    return this.getPossibleMoves().length > 0;
  }

  // Get list of all valid possible swaps
  getPossibleMoves() {
    const validMoves = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // Test right neighbor
        if (c + 1 < this.cols) {
          if (this.testSwap(r, c, r, c + 1)) {
            validMoves.push({ from: { r, c }, to: { r, c: c + 1 } });
          }
        }
        // Test down neighbor
        if (r + 1 < this.rows) {
          if (this.testSwap(r, c, r + 1, c)) {
            validMoves.push({ from: { r, c }, to: { r: r + 1, c } });
          }
        }
      }
    }
    return validMoves;
  }

  // Reshuffle board when no moves are left
  shuffleBoard() {
    const allChips = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          allChips.push(this.grid[r][c]);
        }
      }
    }

    let attempts = 0;
    let found = false;

    while (attempts < 100 && !found) {
      // Fisher-Yates shuffle
      for (let i = allChips.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = allChips[i];
        allChips[i] = allChips[j];
        allChips[j] = temp;
      }

      // Reassign to grid
      let idx = 0;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.grid[r][c] = allChips[idx++];
        }
      }

      // Must have NO initial matches and AT LEAST ONE valid move
      if (this.findMatches().matchedCells.size === 0 && this.hasValidMoves()) {
        found = true;
      }
      attempts++;
    }

    if (!found) {
      // If shuffle couldn't find a valid configuration, regenerate colors
      this.generateInitialBoard();
    }
  }

  // Clear matched backdrops and return how many were newly removed
  clearBackdrops(matchedCellsSet) {
    const newlyCleared = [];
    for (const key of matchedCellsSet) {
      const [r, c] = key.split(',').map(Number);
      if (this.backdrops[r] && this.backdrops[r][c]) {
        this.backdrops[r][c] = false;
        newlyCleared.push({ r, c });
      }
    }
    return newlyCleared;
  }

  // Apply gravity: drop existing chips down, spawn new ones at top
  applyGravity() {
    const movements = []; // { chip, fromR, fromC, toR, toC, isNew }

    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;

      // Scan from bottom up to shift existing chips down
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== emptyRow) {
            const chip = this.grid[r][c];
            this.grid[emptyRow][c] = chip;
            this.grid[r][c] = null;
            movements.push({
              chip,
              fromR: r,
              fromC: c,
              toR: emptyRow,
              toC: c,
              isNew: false
            });
          }
          emptyRow--;
        }
      }

      // Fill remaining empty spots at top with brand new chips
      let newCount = 0;
      for (let r = emptyRow; r >= 0; r--) {
        newCount++;
        const newChip = {
          id: this.nextChipId++,
          color: this.getRandomColor()
        };
        this.grid[r][c] = newChip;
        movements.push({
          chip: newChip,
          fromR: -newCount, // starting above the board
          fromC: c,
          toR: r,
          toC: c,
          isNew: true
        });
      }
    }

    return movements;
  }
}

window.MatchThreeGame = MatchThreeGame;
