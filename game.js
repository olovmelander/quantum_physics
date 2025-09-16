// --- THEME SWITCHER ---
const themeToggleButton = document.getElementById('theme-toggle-btn');
const body = document.body;

themeToggleButton.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    themeToggleButton.textContent = body.classList.contains('dark-mode')
        ? 'Switch to Light Mode'
        : 'Switch to Dark Mode';
});

// --- GAME SETUP ---
const canvas = document.getElementById('quantum-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resizeCanvas() {
    const container = document.getElementById('quantum-animation');
    // Set a fixed aspect ratio for the game, e.g., 16:9
    const aspectRatio = 16 / 9;
    width = container.clientWidth - 32; // 2 * padding
    height = width / aspectRatio;
    canvas.width = width;
    canvas.height = height;
}

// --- GAME CONSTANTS ---
const GRAVITY = 0.5;
const PLAYER_SPEED = 5;
const JUMP_FORCE = -12;

// --- GOAL ---
class Goal {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }

    draw() {
        ctx.fillStyle = '#ffc107'; // A gold color
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// --- PLATFORM ---
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        ctx.fillStyle = '#6c757d'; // A nice neutral gray
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- PLAYER ---
class Player {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = 100;
        this.y = height - this.height - 50; // Start on a platform
        this.dx = 0;
        this.dy = 0;
        this.onGround = false;
        this.isInSuperposition = false;
        this.ghosts = [];
    }

    draw() {
        // Draw the player
        ctx.fillStyle = this.isInSuperposition ? 'rgba(255, 255, 255, 0.5)' : 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw ghosts
        if (this.isInSuperposition) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (const ghost of this.ghosts) {
                ctx.fillRect(ghost.x, ghost.y, this.width, this.height);
            }
        }
    }

    update() {
        if (this.isInSuperposition) return; // Pause movement during superposition

        // Apply horizontal movement
        this.x += this.dx;

        // Apply gravity
        this.dy += GRAVITY;
        this.y += this.dy;

        // Assume not on ground until we find a platform
        let onAnyPlatform = false;

        // Platform collision
        for (const platform of platforms) {
            const playerBottom = this.y + this.height;
            const platformTop = platform.y;
            const playerRight = this.x + this.width;
            const platformRight = platform.x + platform.width;

            if (playerRight > platform.x && this.x < platformRight) {
                const lastPlayerBottom = playerBottom - this.dy;
                if (playerBottom >= platformTop && lastPlayerBottom <= platformTop) {
                    this.y = platformTop - this.height;
                    this.dy = 0;
                    onAnyPlatform = true;
                    break;
                }
            }
        }
        this.onGround = onAnyPlatform;

        if (this.y + this.height > height && !this.onGround) {
            this.y = height - this.height;
            this.dy = 0;
            this.onGround = true;
        }
    }

    jump() {
        if (this.onGround && !this.isInSuperposition) {
            this.dy = JUMP_FORCE;
        }
    }

    enterSuperposition() {
        console.log(`Entering superposition. onGround: ${this.onGround}, isInSuperposition: ${this.isInSuperposition}`);
        if (!this.onGround || this.isInSuperposition) {
            console.log('Superposition blocked.');
            return;
        }
        this.isInSuperposition = true;
        this.ghosts = [];
        console.log('Superposition activated.');

        // Define potential leaps based on player's direction
        const facingDirection = (keys.right ? 1 : (keys.left ? -1 : 1));
        const longLeapX = 250;
        const shortLeapX = 100;
        const leapHeight = 120;

        // Ghost 1: A long leap forward
        this.ghosts.push({ x: this.x + longLeapX * facingDirection, y: this.y - leapHeight });
        // Ghost 2: A shorter, higher leap
        this.ghosts.push({ x: this.x + shortLeapX * facingDirection, y: this.y - leapHeight * 1.5 });
        // Ghost 3: A simple hop forward
        this.ghosts.push({ x: this.x + shortLeapX * facingDirection, y: this.y - 20 });
    }

    collapse(targetX, targetY) {
        this.x = targetX;
        this.y = targetY;
        this.isInSuperposition = false;
        this.ghosts = [];
        this.dy = 0; // Reset vertical velocity to prevent sudden fall
        this.onGround = false; // Will be re-evaluated in the next update
    }
}

// --- KEYBOARD INPUT ---
const keys = {
    left: false,
    right: false,
};

function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') player.jump();
    if (e.key === 's' || e.key === 'S') player.enterSuperposition();
    if ((e.key === 'r' || e.key === 'R') && gameWon) {
        init();
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
}

// --- GAME LOOP ---
let player;
let platforms = [];
let goal;
let gameWon = false;

function init() {
    resizeCanvas();
    gameWon = false;

    // Define level platforms for the test level
    platforms = [
        // Starting platform
        new Platform(50, height - 50, 200, 20),
        // Destination platform across a wide gap
        new Platform(width - 250, height - 50, 200, 20)
    ];

    // Place the goal on the destination platform
    goal = new Goal(width - 150, height - 90, 40);

    player = new Player();
    // Place player on the starting platform
    player.x = platforms[0].x + 50;
    player.y = platforms[0].y - player.height;


    // Re-register event listeners if init is called again on resize
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Add click listener for collapsing superposition
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.addEventListener('click', handleCanvasClick);

    // Start the game loop if it's not already running
    if (typeof gameLoop.requestId === 'undefined' || gameWon) {
        gameLoop();
    }
}

function handleCanvasClick(e) {
    if (!player.isInSuperposition) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find which ghost was clicked
    for (const ghost of player.ghosts) {
        if (
            clickX >= ghost.x &&
            clickX <= ghost.x + player.width &&
            clickY >= ghost.y &&
            clickY <= ghost.y + player.height
        ) {
            player.collapse(ghost.x, ghost.y);
            break; // Collapse to the first ghost found
        }
    }
}

function gameLoop() {
    if (gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('You Won!', width / 2, height / 2);
        ctx.font = '20px sans-serif';
        ctx.fillText('Press R to restart', width / 2, height / 2 + 40);
        return; // Stop the game loop
    }

    // Update player speed based on keys pressed
    player.dx = 0;
    if (keys.left) player.dx = -PLAYER_SPEED;
    if (keys.right) player.dx = PLAYER_SPEED;

    // Update game state
    player.update();

    // Check for win condition
    if (
        player.x < goal.x + goal.size &&
        player.x + player.width > goal.x &&
        player.y < goal.y + goal.size &&
        player.y + player.height > goal.y
    ) {
        gameWon = true;
    }


    // Clear canvas and redraw
    ctx.clearRect(0, 0, width, height);

    // Draw platforms
    for (const platform of platforms) {
        platform.draw();
    }

    // Draw goal
    goal.draw();

    // Draw player
    player.draw();

    gameLoop.requestId = requestAnimationFrame(gameLoop);
}
// Add a property to the function to track the animation frame
gameLoop.requestId = undefined;

// --- START ---
window.addEventListener('resize', init);
init();
