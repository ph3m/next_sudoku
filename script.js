const DIFFICULTIES = {
  easy: 36, medium: 46, hard: 52, expert: 58
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === n || board[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    if (board[br + i][bc + j] === n) return false;
  return true;
}

function solve(board) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (board[r][c] === 0) {
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (isValid(board, r, c, n)) {
          board[r][c] = n;
          if (solve(board)) return true;
          board[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function generatePuzzle(clues) {
  const full = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(full);
  const solution = full.map(r => [...r]);
  const puzzle = full.map(r => [...r]);
  const cells = shuffle([...Array(81).keys()]);
  let removed = 0;
  for (const idx of cells) {
    if (removed >= 81 - clues) break;
    const r = Math.floor(idx / 9), c = idx % 9;
    puzzle[r][c] = 0;
    removed++;
  }
  return { puzzle, solution };
}

let state = {
  puzzle: [], solution: [], board: [], given: [],
  selected: null, mistakes: 0, maxMistakes: 3,
  seconds: 0, timerInterval: null,
  candidateMode: false, candidates: [],
  difficulty: 'easy', gameOver: false
};

function newGame(diff) {
  const clues = 81 - DIFFICULTIES[diff];
  const { puzzle, solution } = generatePuzzle(clues);
  state.puzzle = puzzle;
  state.solution = solution;
  state.board = puzzle.map(r => [...r]);
  state.given = puzzle.map(r => r.map(v => v !== 0));
  state.candidates = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  state.selected = null;
  state.mistakes = 0;
  state.seconds = 0;
  state.candidateMode = false;
  state.gameOver = false;
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (!state.gameOver) { state.seconds++; renderTimer(); }
  }, 1000);
  renderAll();
}

function renderTimer() {
  const m = Math.floor(state.seconds / 60);
  const s = state.seconds % 60;
  document.getElementById('timer').textContent = m + ':' + String(s).padStart(2, '0');
}

function renderMistakes() {
  document.getElementById('mistakes').textContent = state.mistakes + ' / ' + state.maxMistakes;
}

function getCellClasses(r, c) {
  const classes = ['cell'];
  const val = state.board[r][c];
  const sel = state.selected;
  if (state.given[r][c]) classes.push('given');
  if (sel) {
    const [sr, sc] = sel;
    if (r === sr && c === sc) {
      classes.push('selected');
    } else if (r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))) {
      classes.push('highlighted');
    } else if (val && val === state.board[sr][sc]) {
      classes.push('same-num');
    }
  }
  return classes.join(' ');
}

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const cell = document.createElement('div');
    cell.className = getCellClasses(r, c);
    cell.dataset.r = r; cell.dataset.c = c; cell.dataset.row = r;
    const val = state.board[r][c];
    const cands = state.candidates[r][c];
    if (val) {
      cell.textContent = val;
    } else if (cands.size > 0) {
      const cDiv = document.createElement('div');
      cDiv.className = 'candidates';
      for (let n = 1; n <= 9; n++) {
        const sp = document.createElement('span');
        sp.textContent = cands.has(n) ? n : '';
        cDiv.appendChild(sp);
      }
      cell.appendChild(cDiv);
    }
    cell.addEventListener('click', () => selectCell(r, c));
    grid.appendChild(cell);
  }
}

function renderNumPad() {
  const pad = document.getElementById('numPad');
  pad.innerHTML = '';
  const counts = Array(10).fill(0);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
    if (state.board[r][c]) counts[state.board[r][c]]++;
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn' + (counts[n] >= 9 ? ' used' : '');
    btn.textContent = n;
    btn.addEventListener('click', () => inputNumber(n));
    pad.appendChild(btn);
  }
}

function renderAll() {
  renderGrid();
  renderNumPad();
  renderMistakes();
  renderTimer();
  document.getElementById('candidateBtn').className = 'ctrl-btn' + (state.candidateMode ? ' candidate-mode' : '');
}

function selectCell(r, c) {
  state.selected = [r, c];
  renderGrid();
}

function inputNumber(n) {
  if (!state.selected || state.gameOver) return;
  const [r, c] = state.selected;
  if (state.given[r][c]) return;
  if (state.candidateMode) {
    if (state.board[r][c]) return;
    if (state.candidates[r][c].has(n)) state.candidates[r][c].delete(n);
    else state.candidates[r][c].add(n);
    renderGrid();
    return;
  }
  if (n === state.solution[r][c]) {
    state.board[r][c] = n;
    state.candidates[r][c].clear();
    renderAll();
    checkWin();
  } else {
    state.mistakes++;
    renderMistakes();
    const cells = document.querySelectorAll('.cell');
    const idx = r * 9 + c;
    cells[idx].classList.add('error');
    cells[idx].textContent = n;
    setTimeout(() => renderGrid(), 700);
    if (state.mistakes >= state.maxMistakes) {
      state.gameOver = true;
      setTimeout(() => showLose(), 900);
    }
  }
}

function eraseCell() {
  if (!state.selected || state.gameOver) return;
  const [r, c] = state.selected;
  if (state.given[r][c]) return;
  state.board[r][c] = 0;
  state.candidates[r][c].clear();
  renderAll();
}

function checkWin() {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
    if (state.board[r][c] !== state.solution[r][c]) return;
  state.gameOver = true;
  clearInterval(state.timerInterval);
  setTimeout(showWin, 400);
}

function showWin() {
  const m = Math.floor(state.seconds / 60);
  const s = state.seconds % 60;
  const overlay = document.createElement('div');
  overlay.className = 'win-overlay';
  overlay.innerHTML = `<h2>Puzzle solved!</h2><p>Time: ${m}:${String(s).padStart(2, '0')} · Mistakes: ${state.mistakes}</p><button id="winNewGame">Play again</button>`;
  document.getElementById('app').appendChild(overlay);
  overlay.querySelector('#winNewGame').addEventListener('click', () => { overlay.remove(); newGame(state.difficulty); });
}

function showLose() {
  const overlay = document.createElement('div');
  overlay.className = 'win-overlay';
  overlay.innerHTML = `<h2 style="color:#ff4444">Game over</h2><p>Too many mistakes!</p><button id="loseNewGame">Try again</button>`;
  document.getElementById('app').appendChild(overlay);
  overlay.querySelector('#loseNewGame').addEventListener('click', () => { overlay.remove(); newGame(state.difficulty); });
}

// Event listeners
document.getElementById('diffBar').addEventListener('click', e => {
  const btn = e.target.closest('[data-d]');
  if (!btn) return;
  document.querySelectorAll('#diffBar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.difficulty = btn.dataset.d;
  newGame(state.difficulty);
});

document.getElementById('eraserBtn').addEventListener('click', eraseCell);
document.getElementById('newGameBtn').addEventListener('click', () => newGame(state.difficulty));
document.getElementById('candidateBtn').addEventListener('click', () => {
  state.candidateMode = !state.candidateMode;
  document.getElementById('candidateBtn').className = 'ctrl-btn' + (state.candidateMode ? ' candidate-mode' : '');
});
document.getElementById('hintBtn').addEventListener('click', () => {
  if (state.gameOver) return;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (!state.board[r][c]) {
      state.board[r][c] = state.solution[r][c];
      state.candidates[r][c].clear();
      state.selected = [r, c];
      renderAll();
      checkWin();
      return;
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') inputNumber(parseInt(e.key));
  if (e.key === 'Backspace' || e.key === 'Delete') eraseCell();
  if (!state.selected) return;
  const [r, c] = state.selected;
  if (e.key === 'ArrowUp' && r > 0) selectCell(r - 1, c);
  if (e.key === 'ArrowDown' && r < 8) selectCell(r + 1, c);
  if (e.key === 'ArrowLeft' && c > 0) selectCell(r, c - 1);
  if (e.key === 'ArrowRight' && c < 8) selectCell(r, c + 1);
});

// Start game
newGame('easy');