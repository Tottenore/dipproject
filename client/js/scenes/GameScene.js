class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = new Map();
        this.playerSprite = null;
        this.roomId = null;
        this.isHost = false;
        this.cursors = null;
        this.playerSpeed = 175;
    }

    init(data) {
        this.roomId = data.roomId;
        this.isHost = data.isHost;
        this.nickname = data.nickname; // Получаем никнейм из параметров
        updateDebug(`GameScene initialized - Room: ${this.roomId}, Host: ${this.isHost}`);
    }

    preload() {
        try {
            // Загружаем спрайты
            this.load.spritesheet('character', 
                'assets/characters/character.png',
                { 
                    frameWidth: 32, 
                    frameHeight: 48 
                }
            );
        } catch (error) {
            updateDebug(`Error loading assets: ${error.message}`);
            console.error('Error loading assets:', error);
        }
    }

    create() {
        updateDebug('GameScene create started');

        if (!window.socket) {
            updateDebug('Error: Socket not initialized in GameScene');
            return;
        }

        try {
            // Создаем временный фон
            this.add.rectangle(0, 0, 800, 600, 0x4488aa).setOrigin(0, 0);

            // Создаем информацию о комнате
            this.createRoomInfo();

            // Создаем локального игрока
            this.createLocalPlayer();

            // Настраиваем управление
            this.setupControls();

            // Настраиваем обработчики событий сокета
            this.setupSocketHandlers();

            // Создаем анимации
            this.createAnimations();

            updateDebug('GameScene create completed successfully');
        } catch (error) {
            updateDebug(`Error in GameScene create: ${error.message}`);
            console.error('Error in GameScene create:', error);
        }
    }

    createRoomInfo() {
        // Добавляем информацию о комнате
        this.add.text(10, 10, `Room: ${this.roomId}`, {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 }
        });
    }

    createLocalPlayer() {
    try {
        
        if (this.localPlayer) {
            console.warn('Попытка создать локального игрока, когда он уже существует');
            return;
        }
            
        const startX = Math.random() * 700 + 50;
        const startY = Math.random() * 500 + 50;
        
        // Создаем игрока используя класс Player
        this.localPlayer = new Player(this, startX, startY, 'character', window.socket.id, this.nickname);
        this.players.set(window.socket.id, this.localPlayer);
        
        console.log('Локальный игрок создан:', window.socket.id);
        updateDebug('Local player created');
        } catch (error) {
            updateDebug(`Error creating local player: ${error.message}`);
            console.error('Error creating local player:', error);
            throw error; // Пробрасываем ошибку дальше для отладки
        }
    }

    setupControls() {
        // Создаем управление
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Добавляем WASD
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    setupSocketHandlers() {
        // Обработка присоединения нового игрока
        window.socket.on('player_joined', (data) => {
            updateDebug(`Player joined: ${data.nickname}`);
            this.addOtherPlayer(data);
        });

        // Обработка движения других игроков
        window.socket.on('player_moved', (data) => {
            this.handlePlayerMovement(data);
        });

        // Обработка ухода игрока
        window.socket.on('player_left', (data) => {
            this.removePlayer(data.playerId);
        });

        socket.on('existing_players', (players) => {
        players.forEach(playerData => {
            if (!this.players.has(playerData.id) && playerData.id !== socket.id) {
                const player = new Player(
                    this,
                    playerData.x,
                    playerData.y,
                    'character',
                    playerData.id,
                    playerData.nickname
                );
                this.players.set(playerData.id, player);
            }
        });
        });
    }

    createAnimations() {
        // Создаем анимации для движения
        const createAnim = (key, frames, frameRate = 8) => {
            this.anims.create({
                key: key,
                frames: this.anims.generateFrameNumbers('character', { 
                    start: frames.start, 
                    end: frames.end 
                }),
                frameRate: frameRate,
                repeat: -1
            });
        };

        try {
            createAnim('walk_down', { start: 0, end: 2 });
            createAnim('walk_left', { start: 3, end: 5 });
            createAnim('walk_right', { start: 6, end: 8 });
            createAnim('walk_up', { start: 9, end: 11 });
        } catch (error) {
            updateDebug('Using basic animations due to error');
            console.error('Error creating animations:', error);
        }
    }

    addOtherPlayer(data) {
        try {
            // Создаем спрайт для другого игрока
            const otherPlayer = this.physics.add.sprite(data.x || 400, data.y || 300, 'character');
            
            if (!otherPlayer.texture.key) {
                // Если текстура не загрузилась, используем прямоугольник
                otherPlayer.destroy();
                otherPlayer = this.add.rectangle(data.x || 400, data.y || 300, 32, 48, 0x00ff00);
            }

            // Добавляем никнейм
            const nicknameText = this.add.text(data.x || 400, (data.y || 300) - 20, data.nickname, {
                fontSize: '14px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5);

            // Сохраняем информацию о другом игроке
            this.players.set(data.playerId, {
                sprite: otherPlayer,
                nicknameText: nicknameText
            });
        } catch (error) {
            updateDebug(`Error adding other player: ${error.message}`);
            console.error('Error adding other player:', error);
        }
    }

    handlePlayerMovement(data) {
        const player = this.players.get(data.playerId);
        if (player) {
            player.sprite.setPosition(data.x, data.y);
            player.nicknameText.setPosition(data.x, data.y - 20);
        }
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.sprite.destroy();
            player.nicknameText.destroy();
            this.players.delete(playerId);
            updateDebug(`Player removed: ${playerId}`);
        }
    }

    update() {
        if (!this.localPlayer || !window.socket) return;

        // Обновляем позицию локального игрока
        this.localPlayer.update(this.cursors);

        // Отправляем информацию о движении на сервер
        if (this.localPlayer.body.velocity.x !== 0 || this.localPlayer.body.velocity.y !== 0) {
            window.socket.emit('player_move', {
                x: this.localPlayer.x,
                y: this.localPlayer.y,
                animation: this.localPlayer.anims.currentAnim 
                    ? this.localPlayer.anims.currentAnim.key 
                    : 'idle'
            });
        }
    }
}