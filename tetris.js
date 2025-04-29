// 게임 캔버스 세팅
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(30, 30);

// 다음 블록 캔버스 세팅
const nextPieceCanvas = document.getElementById('nextPiece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
nextPieceContext.scale(20, 20);

// 게임 상태 변수들
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let isPaused = false;
let score = 0;
let level = 1;
let lines = 0;
let requestId = null;
let nextTetrimino = null;

// 테트리스 필드 초기화
const arena = createMatrix(10, 20);

// 테트리미노 색상 정의
const colors = [
    null,
    '#FF0D72', // I - 빨강
    '#0DC2FF', // L - 파랑
    '#0DFF72', // J - 초록
    '#F538FF', // O - 분홍
    '#FF8E0D', // S - 오렌지
    '#FFE138', // T - 노랑
    '#3877FF'  // Z - 남색
];

// 테트리미노 형태 정의
const tetriminos = {
    'I': [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
    ],
    'L': [
        [0, 2, 0],
        [0, 2, 0],
        [0, 2, 2],
    ],
    'J': [
        [0, 3, 0],
        [0, 3, 0],
        [3, 3, 0],
    ],
    'O': [
        [4, 4],
        [4, 4],
    ],
    'S': [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
    ],
    'T': [
        [0, 0, 0],
        [6, 6, 6],
        [0, 6, 0],
    ],
    'Z': [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
    ]
};

// 현재 플레이어(테트리미노) 객체
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
};

// 버튼 요소
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// 점수, 레벨, 라인 요소
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');

// 버튼 이벤트 리스너
startBtn.addEventListener('click', () => {
    if (!requestId) {
        startGame();
        startBtn.style.display = 'none';
        restartBtn.style.display = 'block';
    }
});

restartBtn.addEventListener('click', () => {
    cancelAnimationFrame(requestId);
    resetGame();
    startGame();
});

// 키보드 이벤트 처리
document.addEventListener('keydown', event => {
    if (gameOver || isPaused) return;

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate(1);
    } else if (event.key === ' ') { // 스페이스바
        hardDrop();
    } else if (event.key === 'p' || event.key === 'P') {
        togglePause();
    }
});

// 게임 시작
function startGame() {
    gameOver = false;
    nextTetrimino = createTetrimino();
    playerReset();
    updateScore();
    update();
}

// 게임 리셋
function resetGame() {
    arena.forEach(row => row.fill(0));
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    updateScore();
    gameOver = false;
}

// 일시정지 토글
function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
        lastTime = 0;
        update();
    }
}

// 메트릭스 생성 (게임 필드)
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// 충돌 검사
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 랜덤 테트리미노 생성
function createTetrimino() {
    const pieces = 'ILJOTSZ';
    const tetrimino = pieces[Math.floor(Math.random() * pieces.length)];
    return tetriminos[tetrimino];
}

// 드롭 인터벌 계산 (레벨에 따라 빨라짐)
function calculateDropInterval() {
    return Math.max(100, 1000 - (level * 100));
}

// 메트릭스 그리기
function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // 블록 경계 그리기
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// 다음 블록 그리기
function drawNextPiece() {
    nextPieceContext.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (nextTetrimino) {
        // 중앙에 그리기 위한 오프셋 계산
        const offsetX = (5 - nextTetrimino[0].length) / 2;
        const offsetY = (5 - nextTetrimino.length) / 2;
        drawMatrix(nextTetrimino, {x: offsetX, y: offsetY}, nextPieceContext);
    }
}

// 전체 게임 화면 그리기
function draw() {
    context.fillStyle = '#202028';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
    drawNextPiece();
}

// 행 완성 체크 및 제거
function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        
        rowCount++;
    }
    
    if (rowCount > 0) {
        // 점수 계산 (라인 개수의 제곱 * 100 * 레벨)
        score += rowCount * rowCount * 100 * level;
        lines += rowCount;
        
        // 10줄마다 레벨업
        if (lines >= level * 10) {
            level++;
            dropInterval = calculateDropInterval();
        }
        
        updateScore();
    }
}

// 점수, 레벨, 라인 수 업데이트
function updateScore() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// 메트릭스 병합 (테트리미노를 게임 필드에 합치기)
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// 좌우 이동
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

// 블록 회전
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    
    // 회전 후 충돌이 발생하면 다시 원위치
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        // 너무 많이 조정해도 안되면 회전 취소
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

// 메트릭스 회전
function rotate(matrix, dir) {
    // 행과 열 전환 (transpose)
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    
    // 방향에 따라 행 뒤집기
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// 블록 드롭
function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

// 하드 드롭 (스페이스바)
function hardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    dropCounter = 0;
}

// 새 테트리미노 생성
function playerReset() {
    if (nextTetrimino === null) {
        player.matrix = createTetrimino();
    } else {
        player.matrix = nextTetrimino;
    }
    
    nextTetrimino = createTetrimino();
    
    // 초기 위치 설정
    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
    
    // 게임 오버 체크
    if (collide(arena, player)) {
        gameOver = true;
        cancelAnimationFrame(requestId);
        requestId = null;
        // 게임 오버 메시지
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = '1px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('GAME OVER', 5, 9);
    }
}

// 게임 업데이트 루프
function update(time = 0) {
    if (gameOver) return;
    if (isPaused) {
        requestId = requestAnimationFrame(update);
        return;
    }
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestId = requestAnimationFrame(update);
}

// 처음에는 게임 시작 전이므로 안내 메시지 표시
context.fillStyle = '#202028';
context.fillRect(0, 0, canvas.width, canvas.height);
context.font = '0.7px Arial';
context.fillStyle = 'white';
context.textAlign = 'center';
context.fillText('시작 버튼을 눌러주세요', 5, 10);
