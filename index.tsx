/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Получение элементов DOM ---
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const scoreEl = document.getElementById('score')!;
const levelEl = document.getElementById('level')!;
const livesEl = document.getElementById('lives')!;

const gameOverlay = document.getElementById('game-overlay')!;
const startScreen = document.getElementById('start-screen')!;
const levelCompleteScreen = document.getElementById('level-complete-screen')!;
const gameOverScreen = document.getElementById('game-over-screen')!;
const winScreen = document.getElementById('win-screen')!;

const finalScoreEl = document.getElementById('final-score')!;
const winFinalScoreEl = document.getElementById('win-final-score')!;

const startButton = document.getElementById('start-button')!;
const nextLevelButton = document.getElementById('next-level-button')!;
const restartButton = document.getElementById('restart-button')!;
const winRestartButton = document.getElementById('win-restart-button')!;

// --- Типы и интерфейсы ---
type PowerUpType = 'wide-paddle' | 'multi-ball';

interface PowerUp {
    x: number;
    y: number;
    width: number;
    height: number;
    type: PowerUpType;
    color: string;
    symbol: string;
}

interface Ball {
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    radius: number;
    onPaddle: boolean;
}

// --- Игровые переменные ---
let score = 0;
let lives = 3;
let level = 1;
const totalLevels = 3;
let gameRunning = false;
// FIX: Use ReturnType<typeof setTimeout> to correctly infer the return type of setTimeout, which can differ between browser (number) and Node.js (Timeout object) environments, preventing type errors.
let activePowerUpTimeout: ReturnType<typeof setTimeout> | undefined;

let balls: Ball[] = [];
let powerUps: PowerUp[] = [];

// --- Свойства объектов ---
// Платформа
const paddleHeight = 15;
const originalPaddleWidth = 120;
let paddleWidth = originalPaddleWidth;
let paddleX = (canvas.width - paddleWidth) / 2;

// Мяч
const ballRadius = 10;

// Кирпичи
const brickRowCount = 5;
const brickColumnCount = 9;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 40;
const brickOffsetLeft = 30;
const brickColors = ['#FF3366', '#FF9933', '#FFFF33', '#33FF66', '#3399FF'];

let bricks: { x: number; y: number; status: number; color: string }[][] = [];

// --- Уровни ---
const levelLayouts = [
    // Уровень 1: Стандартный
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Уровень 2: Пирамида
    [
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Уровень 3: Шахматная доска
    [
        [1, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
];


// --- Функции ---

function setupBricks() {
    bricks = [];
    const layout = levelLayouts[level - 1];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const brickStatus = layout[r] ? layout[r][c] : 0;
            bricks[c][r] = { x: 0, y: 0, status: brickStatus, color: brickColors[r] };
        }
    }
}

function updateUI() {
    scoreEl.textContent = score.toString();
    levelEl.textContent = level.toString();
    livesEl.textContent = lives.toString();
}

function resetBallAndPaddle() {
    paddleWidth = originalPaddleWidth;
    if (activePowerUpTimeout) clearTimeout(activePowerUpTimeout);
    paddleX = (canvas.width - paddleWidth) / 2;
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - paddleHeight - ballRadius - 5,
        speedX: 5,
        speedY: -5,
        radius: ballRadius,
        onPaddle: true,
    }];
}

function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    gameRunning = false;
    powerUps = [];
    setupBricks();
    resetBallAndPaddle();
    updateUI();
}

function nextLevel() {
    level++;
    if (level > totalLevels) {
        gameOverlay.classList.remove('hidden');
        winScreen.classList.remove('hidden');
        winFinalScoreEl.textContent = score.toString();
        gameRunning = false;
    } else {
        gameOverlay.classList.remove('hidden');
        levelCompleteScreen.classList.remove('hidden');
        gameRunning = false;
        powerUps = [];
        setupBricks();
        resetBallAndPaddle();
        updateUI();
    }
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = '#00DDFF';
    ctx.fill();
    ctx.closePath();
}

function drawBalls() {
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.closePath();
    });
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.closePath();
        ctx.font = '14px "Press Start 2P"';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.symbol, p.x + p.width / 2, p.y + p.height / 2 + 1);
    });
}

function spawnPowerUp(x: number, y: number) {
    if (Math.random() < 0.2) { // 20% chance
        const type: PowerUpType = Math.random() < 0.5 ? 'wide-paddle' : 'multi-ball';
        powerUps.push({
            x: x,
            y: y,
            width: 25,
            height: 25,
            type: type,
            color: type === 'wide-paddle' ? '#33FF66' : '#FF9933',
            symbol: type === 'wide-paddle' ? 'W' : 'M',
        });
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.y += 2; // Speed of falling

        // Collision with paddle
        if (p.x < paddleX + paddleWidth &&
            p.x + p.width > paddleX &&
            p.y < canvas.height - paddleHeight &&
            p.y + p.height > canvas.height - paddleHeight) {
            activatePowerUp(p.type);
            powerUps.splice(i, 1);
        } else if (p.y + p.height > canvas.height) {
            // Remove if it goes off screen
            powerUps.splice(i, 1);
        }
    }
}

function activatePowerUp(type: PowerUpType) {
    if (type === 'wide-paddle') {
        if (activePowerUpTimeout) clearTimeout(activePowerUpTimeout);
        paddleWidth = originalPaddleWidth * 2;
        activePowerUpTimeout = setTimeout(() => {
            paddleWidth = originalPaddleWidth;
        }, 10000);
    } else if (type === 'multi-ball' && balls.length > 0) {
        const originalBall = balls[0];
        balls.push({ ...originalBall, speedX: -originalBall.speedX, onPaddle: false });
        balls.push({ ...originalBall, speedX: originalBall.speedX / 2, speedY: -originalBall.speedY, onPaddle: false });
    }
}


function collisionDetection() {
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];

        // Столкновение со стенами
        if (ball.x + ball.speedX > canvas.width - ball.radius || ball.x + ball.speedX < ball.radius) {
            ball.speedX = -ball.speedX;
        }
        if (ball.y + ball.speedY < ball.radius) {
            ball.speedY = -ball.speedY;
        } else if (ball.y + ball.speedY > canvas.height - ball.radius) {
            // Столкновение с платформой или проигрыш
            if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {
                // BUG FIX: The original condition `ball.y < canvas.height - paddleHeight` was too strict
                // and could fail depending on framerate, causing a life to be lost on a valid hit.
                // This simpler check is more robust.
                ball.speedY = -ball.speedY;
                let deltaX = ball.x - (paddleX + paddleWidth / 2);
                ball.speedX = deltaX * 0.35;
            } else {
                balls.splice(i, 1); // Удалить мяч
            }
        }

        // Столкновение с кирпичами
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                        ball.speedY = -ball.speedY;
                        b.status = 0;
                        score += 10;
                        updateUI();
                        spawnPowerUp(b.x + brickWidth / 2, b.y + brickHeight / 2);
                    }
                }
            }
        }
    }

    // Проверить, закончились ли мячи
    if (balls.length === 0) {
        lives--;
        if (lives <= 0) {
            gameOverlay.classList.remove('hidden');
            gameOverScreen.classList.remove('hidden');
            finalScoreEl.textContent = score.toString();
            gameRunning = false;
        } else {
            resetBallAndPaddle();
        }
        updateUI();
    }

    // Проверить завершение уровня
    let bricksLeft = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                bricksLeft++;
            }
        }
    }

    if (bricksLeft === 0) {
        nextLevel();
    }
}

function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    drawPowerUps();
    drawBalls();
    collisionDetection();
    updatePowerUps();

    balls.forEach(ball => {
        if (ball.onPaddle) {
            ball.x = paddleX + paddleWidth / 2;
            ball.y = canvas.height - paddleHeight - ball.radius - 1;
        } else {
            ball.x += ball.speedX;
            ball.y += ball.speedY;
        }
    });


    requestAnimationFrame(gameLoop);
}


// --- Обработчики событий ---
document.addEventListener('mousemove', (e) => {
    const relativeX = e.clientX - canvas.offsetLeft;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
        if (paddleX < 0) paddleX = 0;
        if (paddleX + paddleWidth > canvas.width) paddleX = canvas.width - paddleWidth;
    }
});

canvas.addEventListener('click', () => {
    if (gameRunning) {
        balls.forEach(ball => {
            if (ball.onPaddle) {
                ball.onPaddle = false;
            }
        });
    }
});

startButton.addEventListener('click', () => {
    gameOverlay.classList.add('hidden');
    startScreen.classList.add('hidden');
    resetGame();
    gameRunning = true;
    gameLoop();
});

nextLevelButton.addEventListener('click', () => {
    gameOverlay.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    gameRunning = true;
    gameLoop();
});

function handleRestart() {
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    gameOverlay.classList.remove('hidden');
    startScreen.classList.remove('hidden');
}

restartButton.addEventListener('click', handleRestart);
winRestartButton.addEventListener('click', handleRestart);


// --- Инициализация ---
updateUI();
setupBricks();
resetBallAndPaddle();
drawPaddle();
drawBalls();
drawBricks();
startScreen.classList.remove('hidden');
gameOverlay.classList.remove('hidden');