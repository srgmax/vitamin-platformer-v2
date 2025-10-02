class VitaminGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameOverlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.scoreElement = document.getElementById('score');
        this.totalElement = document.getElementById('total');
        this.restartBtn = document.getElementById('restartBtn');
        
        // Конфигурация игры
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            gravity: 1.0,
            jumpSpeed: -22, // Увеличена сила прыжка
            moveSpeed: 6,
            friction: 0.85
        };
        
        // Игрок
        this.player = {
            x: 100,
            y: 400,
            width: 30,
            height: 30,
            velocityX: 0,
            velocityY: 0,
            onGround: false,
            color: '#FF6B35'
        };
        
        // Платформы
        this.platforms = [
            {x: 0, y: 550, width: 800, height: 50, color: '#8B4513'},
            {x: 200, y: 450, width: 150, height: 20, color: '#A0522D'},
            {x: 400, y: 350, width: 120, height: 20, color: '#A0522D'},
            {x: 600, y: 250, width: 100, height: 20, color: '#A0522D'},
            {x: 100, y: 300, width: 80, height: 20, color: '#A0522D'}
        ];
        
        // Ресурсы для сбора - копируем изначальное состояние
        this.initialCollectibles = [
            {x: 250, y: 420, collected: false, color: '#FFD700'},
            {x: 450, y: 320, collected: false, color: '#00CED1'},
            {x: 650, y: 220, collected: false, color: '#FF69B4'},
            {x: 150, y: 270, collected: false, color: '#32CD32'},
            {x: 500, y: 500, collected: false, color: '#FF1493'},
            {x: 350, y: 400, collected: false, color: '#9370DB'}
        ];
        
        // Враги-бактерии
        this.initialEnemies = [
            {x: 300, y: 430, width: 20, height: 20, color: '#2F4F2F', velocityX: 1, static: false, initialX: 300, patrolRange: 100},
            {x: 480, y: 330, width: 20, height: 20, color: '#8B4513', velocityX: 0, static: true, initialX: 480, patrolRange: 0},
            {x: 620, y: 230, width: 20, height: 20, color: '#696969', velocityX: -0.5, static: false, initialX: 620, patrolRange: 80},
            {x: 130, y: 280, width: 20, height: 20, color: '#556B2F', velocityX: 0, static: true, initialX: 130, patrolRange: 0},
            {x: 520, y: 480, width: 20, height: 20, color: '#2F4F2F', velocityX: 1.5, static: false, initialX: 520, patrolRange: 120}
        ];
        
        // Клавиши - используем объект для отслеживания состояния
        this.keys = {
            left: false,
            right: false,
            up: false,
            space: false
        };
        
        // Игровой счет
        this.score = 0;
        this.totalCollectibles = this.initialCollectibles.length;
        
        // Анимация
        this.animationTime = 0;
        
        // Состояния игры
        this.gameState = 'playing'; // 'playing', 'dead', 'won'
        this.deathTimer = 0;
        
        // Инициализация ресурсов и врагов
        this.collectibles = JSON.parse(JSON.stringify(this.initialCollectibles));
        this.enemies = JSON.parse(JSON.stringify(this.initialEnemies));
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
        console.log('Игра инициализирована');
    }
    
    setupEventListeners() {
        // Обработка нажатия клавиш
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            e.preventDefault();
            switch(e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.up = true;
                    break;
                case 'Space':
                    this.keys.space = true;
                    break;
            }
        });
        
        // Обработка отпускания клавиш
        document.addEventListener('keyup', (e) => {
            e.preventDefault();
            switch(e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.up = false;
                    break;
                case 'Space':
                    this.keys.space = false;
                    break;
            }
        });
        
        // Кнопка рестарта
        this.restartBtn.addEventListener('click', () => {
            this.restart();
        });
    }
    
    update() {
        this.animationTime += 0.1;
        
        if (this.gameState === 'playing') {
            this.updatePlayer();
            this.updateEnemies();
            this.checkPlatformCollisions();
            this.checkCollectibles();
            this.checkEnemyCollisions();
            this.checkWinCondition();
        } else if (this.gameState === 'dead') {
            this.deathTimer += 0.016; // примерно 60 FPS
            if (this.deathTimer >= 1.5) { // 1.5 секунды до показа экрана
                this.showGameOverlay();
            }
        }
    }
    
    updatePlayer() {
        // Обработка ввода - движение
        if (this.keys.left) {
            this.player.velocityX = -this.config.moveSpeed;
        } else if (this.keys.right) {
            this.player.velocityX = this.config.moveSpeed;
        } else {
            this.player.velocityX *= this.config.friction;
        }
        
        // Прыжок
        if ((this.keys.up || this.keys.space) && this.player.onGround) {
            this.player.velocityY = this.config.jumpSpeed;
            this.player.onGround = false;
        }
        
        // Применение гравитации
        this.player.velocityY += this.config.gravity;
        
        // Обновление позиции
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;
        
        // Проверка границ экрана
        if (this.player.x < 0) {
            this.player.x = 0;
            this.player.velocityX = 0;
        }
        if (this.player.x + this.player.width > this.config.canvasWidth) {
            this.player.x = this.config.canvasWidth - this.player.width;
            this.player.velocityX = 0;
        }
    }
    
    updateEnemies() {
        for (let enemy of this.enemies) {
            if (!enemy.static) {
                enemy.x += enemy.velocityX;
                
                // Патрулирование в пределах заданного диапазона
                if (enemy.x <= enemy.initialX - enemy.patrolRange || 
                    enemy.x >= enemy.initialX + enemy.patrolRange) {
                    enemy.velocityX *= -1;
                }
                
                // Проверка границ платформ для движущихся врагов
                if (enemy.x < 0 || enemy.x + enemy.width > this.config.canvasWidth) {
                    enemy.velocityX *= -1;
                }
            }
        }
    }
    
    checkPlatformCollisions() {
        this.player.onGround = false;
        
        for (let platform of this.platforms) {
            // Проверка столкновения сверху (приземление)
            if (this.player.x < platform.x + platform.width &&
                this.player.x + this.player.width > platform.x &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + 10 &&
                this.player.velocityY > 0) {
                
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.onGround = true;
            }
        }
    }
    
    checkCollectibles() {
        for (let i = 0; i < this.collectibles.length; i++) {
            let collectible = this.collectibles[i];
            if (!collectible.collected) {
                let playerCenterX = this.player.x + this.player.width / 2;
                let playerCenterY = this.player.y + this.player.height / 2;
                let collectibleCenterX = collectible.x + 10;
                let collectibleCenterY = collectible.y + 10;
                
                let distance = Math.sqrt(
                    Math.pow(playerCenterX - collectibleCenterX, 2) +
                    Math.pow(playerCenterY - collectibleCenterY, 2)
                );
                
                if (distance < 25) {
                    collectible.collected = true;
                    this.score++;
                    this.updateUI();
                    console.log(`Ресурс собран! Счет: ${this.score}/${this.totalCollectibles}`);
                }
            }
        }
    }
    
    checkEnemyCollisions() {
        for (let enemy of this.enemies) {
            // Проверка прямоугольного столкновения
            if (this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                
                // Игрок столкнулся с врагом - смерть
                this.playerDie();
                return;
            }
        }
    }
    
    playerDie() {
        console.log('Игрок умер от столкновения с бактерией!');
        this.gameState = 'dead';
        this.deathTimer = 0;
        this.player.velocityX = 0;
        this.player.velocityY = -10; // Небольшой отскок при смерти
    }
    
    checkWinCondition() {
        if (this.score >= this.totalCollectibles && this.gameState === 'playing') {
            this.gameState = 'won';
            console.log('Победа!');
            setTimeout(() => {
                this.showGameOverlay();
            }, 500);
        }
    }
    
    render() {
        // Очистка canvas
        this.ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
        
        // Рисование платформ
        for (let platform of this.platforms) {
            this.ctx.fillStyle = platform.color;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Добавление светлой границы сверху для эффекта
            this.ctx.fillStyle = '#D2B48C';
            this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
        }
        
        // Рисование ресурсов
        for (let collectible of this.collectibles) {
            if (!collectible.collected) {
                this.drawCollectible(collectible);
            }
        }
        
        // Рисование врагов
        for (let enemy of this.enemies) {
            this.drawEnemy(enemy);
        }
        
        // Рисование игрока (показываем только если игра идет или в течение анимации смерти)
        if (this.gameState === 'playing' || (this.gameState === 'dead' && this.deathTimer < 1.0)) {
            this.drawPlayer();
        }
    }
    
    drawPlayer() {
        let bounceOffset = this.player.onGround ? Math.sin(this.animationTime * 5) * 1 : 0;
        let squashFactor = this.player.onGround ? 1 : 0.9 + Math.abs(this.player.velocityY) * 0.005;
        
        // Эффект мерцания при смерти
        let alpha = 1;
        if (this.gameState === 'dead') {
            alpha = Math.sin(this.deathTimer * 15) * 0.5 + 0.5;
        }
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(
            this.player.x + this.player.width / 2, 
            this.player.y + this.player.height / 2 + bounceOffset
        );
        this.ctx.scale(1, squashFactor);
        
        // Тень
        this.ctx.restore();
        this.ctx.save();
        this.ctx.globalAlpha = alpha * 0.2;
        this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height + 8);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.player.width / 2 + 2, 4, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(
            this.player.x + this.player.width / 2, 
            this.player.y + this.player.height / 2 + bounceOffset
        );
        this.ctx.scale(1, squashFactor);
        
        // Основное тело витаминки
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.player.width / 2, this.player.height / 2, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Блеск
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.ellipse(-6, -6, 4, 6, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Белая полоска посередине
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(-this.player.width / 2, -2, this.player.width, 4);
        
        this.ctx.restore();
    }
    
    drawEnemy(enemy) {
        let pulseScale = 0.9 + Math.sin(this.animationTime * 3) * 0.1;
        let wiggleOffset = enemy.static ? 0 : Math.sin(this.animationTime * 4) * 1;
        
        this.ctx.save();
        this.ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + wiggleOffset);
        this.ctx.scale(pulseScale, pulseScale);
        
        // Тень врага
        this.ctx.restore();
        this.ctx.save();
        this.ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height + 6);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, enemy.width / 2 + 1, 3, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
        this.ctx.save();
        this.ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + wiggleOffset);
        this.ctx.scale(pulseScale, pulseScale);
        
        // Тело бактерии с неровными краями
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        
        let centerX = 0;
        let centerY = 0;
        let radiusX = enemy.width / 2;
        let radiusY = enemy.height / 2;
        
        // Создаем неровные края
        for (let i = 0; i < 16; i++) {
            let angle = (i / 16) * 2 * Math.PI;
            let noise = Math.sin(angle * 3 + this.animationTime * 2) * 2;
            let x = centerX + Math.cos(angle) * (radiusX + noise);
            let y = centerY + Math.sin(angle) * (radiusY + noise);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Темная область в центре
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, radiusX * 0.5, radiusY * 0.5, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Маленькие пятна на поверхности
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let i = 0; i < 3; i++) {
            let spotX = Math.cos(i * 2.1 + this.animationTime * 0.5) * radiusX * 0.3;
            let spotY = Math.sin(i * 1.7 + this.animationTime * 0.3) * radiusY * 0.3;
            this.ctx.beginPath();
            this.ctx.arc(spotX, spotY, 1.5, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawCollectible(collectible) {
        let sparkle = Math.sin(this.animationTime * 4) * 0.3 + 0.7;
        let rotation = this.animationTime * 2;
        
        this.ctx.save();
        this.ctx.translate(collectible.x + 10, collectible.y + 10);
        this.ctx.rotate(rotation);
        this.ctx.globalAlpha = sparkle;
        
        // Звездочка
        this.ctx.fillStyle = collectible.color;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            let angle = (i * Math.PI) / 4;
            let radius = i % 2 === 0 ? 8 : 4;
            let x = Math.cos(angle) * radius;
            let y = Math.sin(angle) * radius;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Центральная точка
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateUI() {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score.toString();
        }
        if (this.totalElement) {
            this.totalElement.textContent = this.totalCollectibles.toString();
        }
    }
    
    showGameOverlay() {
        if (this.gameState === 'dead') {
            this.overlayTitle.textContent = 'Вы заразились!';
            this.overlayMessage.textContent = 'Вы столкнулись с опасной бактерией. Попробуйте еще раз!';
        } else if (this.gameState === 'won') {
            this.overlayTitle.textContent = 'Поздравляем!';
            this.overlayMessage.textContent = 'Вы собрали все ресурсы и избежали инфекции!';
        }
        
        if (this.gameOverlay) {
            this.gameOverlay.classList.remove('hidden');
            this.gameOverlay.classList.add('show');
        }
    }
    
    hideGameOverlay() {
        if (this.gameOverlay) {
            this.gameOverlay.classList.remove('show');
            this.gameOverlay.classList.add('hidden');
        }
    }
    
    restart() {
        console.log('Перезапуск игры...');
        
        // Сброс позиции игрока
        this.player.x = 100;
        this.player.y = 400;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.player.onGround = false;
        
        // Сброс ресурсов и врагов - создаем новые объекты
        this.collectibles = JSON.parse(JSON.stringify(this.initialCollectibles));
        this.enemies = JSON.parse(JSON.stringify(this.initialEnemies));
        
        // Сброс счета и состояния
        this.score = 0;
        this.gameState = 'playing';
        this.deathTimer = 0;
        
        // Обновление UI
        this.updateUI();
        
        // Сброс времени анимации
        this.animationTime = 0;
        
        // Скрытие оверлея
        this.hideGameOverlay();
        
        console.log('Игра перезапущена успешно');
    }
}

// Запуск игры после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запуск игры...');
    window.game = new VitaminGame();
});