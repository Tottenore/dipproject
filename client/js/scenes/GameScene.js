class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = new Map();
        this.roomId = null;
        this.isHost = false;
        this.nickname = null;
        this.localPlayerX = null;
        this.localPlayerY = null;
    }

    init(data) {
        this.roomId = data.roomId;
        this.isHost = data.isHost;
        this.nickname = data.nickname;
        this.localPlayerX = data.x;
        this.localPlayerY = data.y;
        updateDebug(`GameScene initialized - Room: ${this.roomId}, Host: ${this.isHost}`);
    }

    preload() {
        try {
            if (!this.textures.exists('character')) {
                this.load.spritesheet('character', 'assets/characters/character.png', { frameWidth: 32, frameHeight: 48 });
            }
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
            this.add.rectangle(0, 0, 800, 600, 0x4488aa).setOrigin(0, 0);
            this.createRoomInfo();

            this.setupControls();
            this.createLocalPlayer(this.localPlayerX, this.localPlayerY);

            this.setupSocketHandlers();
            this.createAnimations();

            updateDebug('GameScene create completed successfully');
        } catch (error) {
            updateDebug(`Error in GameScene create: ${error.message}`);
            console.error('Error in GameScene create:', error);
        }
    }

    createRoomInfo() {
        this.add.text(10, 10, `Room: ${this.roomId}`, {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 }
        });
    }

    createLocalPlayer(x, y) {
        try {
            if (this.localPlayer) {
                console.warn('Попытка создать локального игрока, когда он уже существует');
                return;
            }
            this.localPlayer = new Player(this, x, y, 'character', window.socket.id, this.nickname);
            this.players.set(window.socket.id, this.localPlayer);
            updateDebug('Local player created');
        } catch (error) {
            updateDebug(`Error creating local player: ${error.message}`);
            console.error('Error creating local player:', error);
            throw error;
        }
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    setupSocketHandlers() {
        window.socket.on('player_joined', (data) => {
            updateDebug(`NEW: ${data.nickname} (${data.id})`);
            this.addOtherPlayer(data);
        });

        window.socket.on('player_moved', (data) => {
            if (data.id === window.socket.id) return;
            const player = this.players.get(data.id);
            if (player) {
                player.setPosition(data.x, data.y);
                if (data.animation) player.play(data.animation, true);
            }
        });

        window.socket.on('player_left', (data) => {
            this.removePlayer(data.id);
        });

        window.socket.on('existing_players', (players) => {
            updateDebug('--- [existing_players] called, players: ' + JSON.stringify(players));
            players.forEach(playerData => {
                updateDebug(`EXISTING: ${playerData.nickname} (${playerData.id})`);
                this.addOtherPlayer(playerData);
            });
            updateDebug('CURRENT PLAYERS: ' + JSON.stringify(Array.from(this.players.keys())));
        });
    }

    createAnimations() {
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
            if (this.players.has(data.id)) return;
            const otherPlayer = new Player(
                this,
                data.x,
                data.y,
                'character',
                data.id,
                data.nickname
            );
            this.players.set(data.id, otherPlayer);
            updateDebug(`Player added: ${data.nickname} (${data.id})`);
        } catch (error) {
            updateDebug(`Error adding other player: ${error.message}`);
            console.error('Error adding other player:', error);
        }
    }

    removePlayer(id) {
        const player = this.players.get(id);
        if (player) {
            player.destroy();
            this.players.delete(id);
            updateDebug(`Player removed: ${id}`);
        }
    }

    update() {
        if (!this.localPlayer || !window.socket) return;

        this.localPlayer.update(this.cursors, this.wasd);

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