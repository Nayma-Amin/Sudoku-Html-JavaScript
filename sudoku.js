const byId = id => document.getElementById(id);
const timerEl = byId('timer');
const mistakesEl = byId('mistakes');
const boardEl = byId('board');
const diffEl = byId('difficulty');

let selected = null;
let fixedMask = Array(9).fill(0).map(()=>Array(9).fill(false));
let mistakes = 0;
let startTime = null;
let timerHandle = null;
let initialBoard = Array(9).fill(0).map(()=>Array(9).fill(0));
let currentBoard = Array(9).fill(0).map(()=>Array(9).fill(0));
let solvedBoard = null;

const PUZZLES = {
  easy: [
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    "400000805030000000000700000020000060000080400000010000000603070500200000104000000"
  ],
  medium: [
    "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    "001900030000000054090104000700062010500000006030410007000203070260000000010006800"
  ],
  hard: [
    "005300000800000020070010500400005300010070006003200000060000050000040700000000001",
    "000000907000420180000705026100904000050000040000507009920108000034059000507000000"
  ]
};

function renderBoard(board, mask){
  boardEl.innerHTML = '';
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const v = board[r][c];
      const div = document.createElement('div');
      div.className = 'cell';
      div.tabIndex = 0;
      div.setAttribute('role','gridcell');
      div.dataset.r = r; div.dataset.c = c;
      if (mask?.[r]?.[c]) div.classList.add('fixed');
      if ((r+1)%3===0) div.classList.add('box-bottom');
      div.textContent = v ? v : '';

      div.addEventListener('click', ()=> selectCell(div));
      div.addEventListener('keydown', handleKey);

      boardEl.appendChild(div);
    }
  }
}
function selectCell(el){
  selected = el;
  updateHighlights();
}
function updateHighlights(){
  const cells = [...boardEl.children];
  cells.forEach(cell=>{
    cell.classList.remove('selected','peer','same','error');
  });
  if(!selected) return;

  const r = +selected.dataset.r, c = +selected.dataset.c;
  const v = selected.textContent;

  cells.forEach(cell=>{
    const rr = +cell.dataset.r, cc = +cell.dataset.c;
    if (rr===r && cc===c) cell.classList.add('selected');
    else if (rr===r || cc===c || (Math.floor(rr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(c/3)))
      cell.classList.add('peer');
    if (v && cell.textContent===v) cell.classList.add('same');
  });
}

function strToBoard(s){
  const b = Array(9).fill(0).map(()=>Array(9).fill(0));
  for(let i=0;i<81;i++){
    const r = Math.floor(i/9), c = i%9;
    b[r][c] = +s[i]||0;
  }
  return b;
}
function cloneBoard(b){ return b.map(row=>row.slice()); }
function boardToString(b){ return b.flat().join(''); }

function loadPuzzle(level='medium'){
  const arr = PUZZLES[level];
  const s = arr[Math.floor(Math.random()*arr.length)];
  initialBoard = strToBoard(s);
  currentBoard = cloneBoard(initialBoard);
  fixedMask = initialBoard.map(row=>row.map(v=>v!==0));
  solvedBoard = null;
  mistakes = 0;
  mistakesEl.textContent = '0';
  renderBoard(currentBoard, fixedMask);
  selected = null;
  startTimer();
}
function resetBoard(){
  currentBoard = cloneBoard(initialBoard);
  renderBoard(currentBoard, fixedMask);
  mistakes = 0; mistakesEl.textContent = '0';
  selected = null;
  updateHighlights();
}

function isSafe(b, r, c, n){
  for(let i=0;i<9;i++) if (b[r][i]===n || b[i][c]===n) return false;
  const sr = r - r%3, sc = c - c%3;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++)
    if (b[sr+i][sc+j]===n) return false;
  return true;
}
function findEmpty(b){
  for(let r=0;r<9;r++) for(let c=0;c<9;c++)
    if (b[r][c]===0) return [r,c];
  return null;
}
function solve(b){
  const pos = findEmpty(b);
  if(!pos) return true;
  const [r,c] = pos;
  for(let n=1;n<=9;n++){
    if(isSafe(b,r,c,n)){
      b[r][c]=n;
      if(solve(b)) return true;
      b[r][c]=0;
    }
  }
  return false;
}

function ensureSolved(){
  if (solvedBoard) return true;
  const tmp = cloneBoard(initialBoard);
  if (solve(tmp)) { solvedBoard = tmp; return true; }
  return false;
}

function placeValue(r,c,val){
  if (fixedMask[r][c]) return;
  const idx = r*9+c;
  const cell = boardEl.children[idx];
  currentBoard[r][c] = val;
  cell.textContent = val || '';
  cell.classList.add('blink');
  setTimeout(()=>cell.classList.remove('blink'), 300);
  markConflicts(r,c);
  updateHighlights();
}
function erase(r,c){
  if (fixedMask[r][c]) return;
  placeValue(r,c,0);
}

function markConflicts(r,c){
  [...boardEl.children].forEach(el=>el.classList.remove('error'));
  const v = currentBoard[r][c];
  if (!v) return;

  let conflict = false;

  for(let i=0;i<9;i++){
    if (i!==c && currentBoard[r][i]===v){ conflict=true; markCell(r,i); }
    if (i!==r && currentBoard[i][c]===v){ conflict=true; markCell(i,c); }
  }
  const sr=r-r%3, sc=c-c%3;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++){
    const rr=sr+i, cc=sc+j;
    if ((rr!==r || cc!==c) && currentBoard[rr][cc]===v){ conflict=true; markCell(rr,cc); }
  }
  if (conflict){
    markCell(r,c);
    mistakes++;
    mistakesEl.textContent = String(mistakes);
  }
  function markCell(rr,cc){
    const el = boardEl.children[rr*9+cc];
    el.classList.add('error');
  }
}

function handleKey(e){
  const r = +this.dataset.r, c = +this.dataset.c;
  if (fixedMask[r][c]) return;

  if (e.key>='1' && e.key<='9'){
    placeValue(r,c, Number(e.key));
  } else if (e.key==='Backspace' || e.key==='Delete' || e.key==='0'){
    erase(r,c);
  } else if (e.key==='ArrowUp'){ moveSel(r-1,c); e.preventDefault();}
  else if (e.key==='ArrowDown'){ moveSel(r+1,c); e.preventDefault();}
  else if (e.key==='ArrowLeft'){ moveSel(r,c-1); e.preventDefault();}
  else if (e.key==='ArrowRight'){ moveSel(r,c+1); e.preventDefault();}
}
function moveSel(r,c){
  r=(r+9)%9; c=(c+9)%9;
  const el = boardEl.children[r*9+c];
  el.focus(); selectCell(el);
}

byId('newGame').addEventListener('click', ()=> loadPuzzle(diffEl.value));
byId('reset').addEventListener('click', resetBoard);
byId('solve').addEventListener('click', ()=>{
  const b = cloneBoard(currentBoard);
  if (solve(b)){
    currentBoard = b;
    renderBoard(currentBoard, fixedMask);
    selected = null; updateHighlights();
    stopTimer();
  } else {
    alert('No solution exists for the current board.');
  }
});
byId('check').addEventListener('click', ()=>{
  let ok = true;
  outer: for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const v = currentBoard[r][c];
      if (!v){ ok=false; break outer; }
      currentBoard[r][c]=0;
      if(!isSafe(currentBoard,r,c,v)){ ok=false; }
      currentBoard[r][c]=v;
      if(!ok) break outer;
    }
  }
  if (ok) {
    alert('Looks good so far! 🎉');
  } else {
    alert('There are mistakes on the board. 🔎');
  }
});
byId('hint').addEventListener('click', ()=>{
  if (!ensureSolved()) return alert('This puzzle has no valid solution.');
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      if (currentBoard[r][c]===0 || currentBoard[r][c]!==solvedBoard[r][c]){
        placeValue(r,c, solvedBoard[r][c]);
        return;
      }
    }
  }
  alert('Nothing to hint—board is already solved!');
});

(function buildNumpad(){
  const pad = byId('numpad');
  for(let n=1;n<=9;n++){
    const b = document.createElement('button');
    b.textContent = n;
    b.addEventListener('click', ()=>{
      if (!selected) return;
      const r=+selected.dataset.r, c=+selected.dataset.c;
      if (fixedMask[r][c]) return;
      placeValue(r,c,n);
    });
    pad.appendChild(b);
  }
  const del = document.createElement('button');
  del.textContent = 'Erase';
  del.addEventListener('click', ()=>{
    if (!selected) return;
    const r=+selected.dataset.r, c=+selected.dataset.c;
    erase(r,c);
  });
  pad.appendChild(del);
})();

function startTimer(){
  stopTimer();
  startTime = Date.now();
  timerHandle = setInterval(()=>{
    const s = Math.floor((Date.now()-startTime)/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    timerEl.textContent = `${mm}:${ss}`;
  }, 250);
}
function stopTimer(){
  if (timerHandle){ clearInterval(timerHandle); timerHandle = null; }
}

diffEl.addEventListener('change', ()=> loadPuzzle(diffEl.value));
loadPuzzle(diffEl.value);