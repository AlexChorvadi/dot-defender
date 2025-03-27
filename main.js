
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetButton = document.getElementById('resetButton');
const pauseButton = document.getElementById('pauseButton');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let animationFrameId; // Store the current animation frame ID
let highScore = localStorage.getItem("highScore") || 0;
const playerBullets = [];
const enemyBullets = [];
const enemies = [];
const powerUps = [];
let score = 0;
let playerHealth = 100;
let gameOver = false;
let paused = false;
let bulletPower = 20;
let bulletSpeed = 5;
let playerSpeedBoost = false;
let bulletsExplosive = false;
let enemySpeed = 2 + (score / 50);
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 10,
    color: 'white',
    speed: 3,
};

let mouseX = player.x;
let mouseY = player.y;

// Track mouse movement
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Fire bullets
canvas.addEventListener('click', () => {
    if (!gameOver && !paused) {
		playPlayerShootSound();

        const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        playerBullets.push({
            x: player.x,
            y: player.y,
            angle,
            speed: bulletsExplosive === true ? bulletSpeed * 2 : bulletSpeed,
            type: bulletsExplosive === true ? 'explosive' : 'normal',
        });
    }
});

// Track key presses
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'w')
        keys.w = true;
    if (e.key === 'a')
        keys.a = true;
    if (e.key === 's')
        keys.s = true;
    if (e.key === 'd')
        keys.d = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w')
        keys.w = false;
    if (e.key === 'a')
        keys.a = false;
    if (e.key === 's')
        keys.s = false;
    if (e.key === 'd')
        keys.d = false;
});

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const size = Math.random() * 20 + 20;
    const speed = enemySpeed;
    let x,
    y;

    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -size;
    } else if (side === 1) {
        x = canvas.width + size;
        y = Math.random() * canvas.height;
    } else if (side === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + size;
    } else {
        x = -size;
        y = Math.random() * canvas.height;
    }

    enemies.push({
        x,
        y,
        size,
        speed,
        health: Math.random() * 50 + 50,
        canShoot: Math.random() < 0.5, // 50% chance for an enemy to be able to shoot
        shootInterval: Math.floor(Math.random() * 3000) + 2000 // Random shooting interval between 2-5 seconds
    });
}

function spawnBoss() {
    enemies.push({
        x: Math.random() * canvas.width,
        y: -100, // Spawn from the top of the screen
        size: 50,
        speed: 2,
        health: 500,
        isBoss: true,
        canShoot: true,
        shootInterval: 1000 // Boss shoots every second
    });
}

function spawnPowerUp() {
    const powerUpTypes = ['health', 'speedBoost', 'fireRate', 'explosiveBullet', 'reducePlayerSpeed', 'reduceEnemySpeed'];
	
    const powerUp = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 15,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        duration: 5000, // Duration for the power-up to disappear
    };
    powerUps.push(powerUp);

    // Set a timeout to remove the power-up after its duration
    setTimeout(() => {
        const index = powerUps.indexOf(powerUp);
        if (index !== -1) {
            powerUps.splice(index, 1);
        }
    }, powerUp.duration);
}

function shootEnemyBullets(enemy) {
    if (paused)
        return;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y,
        angle,
        speed: 5,
    });
}

function update() {
    if (gameOver || paused)
        return;

    // Move player
    const currentSpeed = playerSpeedBoost ? player.speed * 2 : player.speed;
    if (keys.w && player.y - currentSpeed >= 0)
        player.y -= currentSpeed;
    if (keys.a && player.x - currentSpeed >= 0)
        player.x -= currentSpeed;
    if (keys.s && player.y + currentSpeed <= canvas.height)
        player.y += currentSpeed;
    if (keys.d && player.x + currentSpeed <= canvas.width)
        player.x += currentSpeed;

    // Move player bullets
    playerBullets.forEach((bullet, index) => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;

        // Remove bullets if out of bounds
        if (
            bullet.x < 0 || bullet.x > canvas.width ||
            bullet.y < 0 || bullet.y > canvas.height) {
            playerBullets.splice(index, 1);
        }
    });

    // Move enemy bullets
    enemyBullets.forEach((bullet, index) => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;

        // Check collision with player
        if (Math.hypot(bullet.x - player.x, bullet.y - player.y) < player.size) {
            playerHealth -= 10; // Adjust damage as needed
            enemyBullets.splice(index, 1);
            if (playerHealth <= 0) {
                gameOver = true;
            }
        }

        // Remove bullets if out of bounds
        if (
            bullet.x < 0 || bullet.x > canvas.width ||
            bullet.y < 0 || bullet.y > canvas.height) {
            enemyBullets.splice(index, 1);
        }
    });

    // Move enemies
    enemies.forEach((enemy, index) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // Enemy shooting
        if (enemy.canShoot && !enemy.shootTimeout) {
            enemy.shootTimeout = setInterval(() => shootEnemyBullets(enemy), enemy.shootInterval);
        }

        // Collision with player
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < player.size + enemy.size) {
            if (enemy.isBoss)
                playerHealth -= 50;
            else
                playerHealth -= 10;
            if (enemy.shootTimeout)
                clearInterval(enemy.shootTimeout); // Clear shooting interval
            enemies.splice(index, 1);
            if (playerHealth <= 0) {
                gameOver = true;
            }
        }

        // Collision with bullets
        playerBullets.forEach((bullet, bulletIndex) => {
            if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.size) {
                enemy.health -= bullet.type === 'explosive' ? bulletPower * 2 : bulletPower;
				
                playerBullets.splice(bulletIndex, 1);

                if (enemy.health <= 0) {
                    if (enemy.isBoss) {
                        score += 100; // Higher score for bosses
                    } else {
                        score += 10;
                    }
                    if (enemy.shootTimeout)
                        clearInterval(enemy.shootTimeout); // Clear shooting interval
					
                    enemies.splice(index, 1);
					
                    if (score % 300 == 0)
                        player.speed += 2; // Speed increases with score
                    if (score % 200 == 0)
                        enemySpeed += 2; // Speed increases with score
                    if (score % 500 == 0)
                        spawnBoss();

                    if (highScore <= score)
                        localStorage.setItem("highScore", score);
                }
            }
        });
    });

    // Power-up collision and effects
    powerUps.forEach((powerUp, index) => {
        const dist = Math.hypot(player.x - powerUp.x, player.y - powerUp.y);

        if (dist < powerUp.size + player.size) {
            switch (powerUp.type) {
            case 'health':
                playerHealth += 20;
                break;
            case 'speedBoost':
                playerSpeedBoost = true;
                setTimeout(() => {
                    playerSpeedBoost = false;
                }, powerUp.duration);
                break;
            case 'fireRate':
                bulletPower += 10;
                break;
            case 'explosiveBullet':
                bulletsExplosive = true;
                setTimeout(() => {
                    bulletsExplosive = false;
                }, powerUp.duration);
                break;
            case 'reducePlayerSpeed':
                if (player.speed >= 4)
                    player.speed -= 2;
                break;
            case 'reduceEnemySpeed':
                if (enemySpeed >= 4)
                    enemySpeed -= 2;
                break;
            }
            powerUps.splice(index, 1);
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();

    // Draw aiming line
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Draw player bullets
    playerBullets.forEach((bullet) => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = bullet.type === 'explosive' ? 'red' : 'yellow';
        ctx.fill();
    });

    // Draw enemy bullets
    enemyBullets.forEach((bullet) => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });

    // Draw enemies
    enemies.forEach((enemy) => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fillStyle = enemy.isBoss ? 'purple' : 
						enemy.canShoot ? 'red' : "rgba(255,114,118,1)";;
        ctx.fill();

        ctx.font = '12px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(Math.round(enemy.health), enemy.x - 10, enemy.y - enemy.size - 10);
    });

    // Draw power-ups
    powerUps.forEach((powerUp) => {
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, Math.PI * 2);
        ctx.fillStyle = powerUp.type === 'health' ? 'green' :
            powerUp.type === 'speedBoost' ? 'blue' :
            powerUp.type === 'fireRate' ? 'pink' :
            powerUp.type === 'reducePlayerSpeed' ? 'purple' :
            powerUp.type === 'reduceEnemySpeed' ? 'yellow' : 'orange';
        ctx.fill();
    });

    // Draw score and health
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    drawHighScore();
    ctx.fillText(`Health: ${playerHealth}`, 10, 60);
    ctx.fillText(`Power: ${bulletPower}`, 10, 90);

    if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '50px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 150, canvas.height / 2);
    }
}

function loop() {
    update();
    draw();
    if (!gameOver && !paused) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

function drawHighScore() {
    let highScore = localStorage.getItem("highScore", score) || 0;
    const text = `High Score: ${highScore}`;
    const x = canvas.width - ctx.measureText(text).width - 10; // 10 pixels padding from the right
    const y = 30; // y-coordinate for the top

    ctx.fillText(text, x, y);
}

pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (!paused) {
        loop(); // Resume the game loop when unpausing
        spawnEnemyInterval = setInterval(spawnEnemy, 1500);
        spawnPowerUpInterval = setInterval(spawnPowerUp, 10000);
    } else {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            clearInterval(spawnPowerUpInterval);
            clearInterval(spawnEnemyInterval);
        }
    }
});

resetButton.addEventListener('click', () => {
    // Stop the existing game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
	enemies.forEach((enemy, index) => {
		if (enemy.shootTimeout){
			clearInterval(enemy.shootTimeout); // Clear shooting interval
		}
	});
	
    score = 0;
    playerHealth = 100;
    playerBullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    powerUps.length = 0;
    gameOver = false;
    playerSpeedBoost = false; // Reset any active speed boosts
    bulletPower = 20; // Reset bullet power to initial value
    enemySpeed = 2 + (score / 50);
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.size = 10;
    player.color = 'white';
    player.speed = 2;
    loop();
});

function ClearAllIntervals(){
	// Get a reference to the last interval + 1
	const interval_id = window.setInterval(function(){}, Number.MAX_SAFE_INTEGER);

	// Clear any timeout/interval up to that id
	for (let i = 1; i < interval_id; i++) {
	  window.clearInterval(i);
	}
}

function playPlayerShootSound() {
    const audio = document.querySelector(`#boom_audio`);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  }

// Continue the game loop
let spawnEnemyInterval = setInterval(spawnEnemy, 1500);
let spawnPowerUpInterval = setInterval(spawnPowerUp, 10000);

loop();
