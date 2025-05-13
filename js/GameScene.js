class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = new Map();
        this.map = null;
    }

    init(data) {
        this.roomId = data.roomId;
        this.isHost = data.isHost;
    }

    preload() {
        // Load character spritesheet
        this.load.spritesheet('character', 'assets/character.png', {
            frameWidth: 32,
            frameHeight: 48
        });

        // Prepare for future map implementation
        this.load.image('tiles', 'assets/tileset.png');
        this.load.tilemapTiledJSON('map', 'assets/map.json');
    }

    create() {
        // Future map implementation placeholder
        this.setupMap();
        
        // Create local player
        this.createLocalPlayer();
        
        // Setup camera
        this.cameras.main.setBounds(0, 0, this.map ? this.map.widthInPixels : 800,
                                        this.map ? this.map.heightInPixels : 600);
        this.cameras.main.startFollow(this.localPlayer);

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Setup socket handlers
        this.setupSocketHandlers();
        
        // Setup collision detection (for future use)
        this.setupCollisions();
        
        // Add game UI
        this.setupUI();
    }

    setupMap() {
        // This will be expanded in the future
        // For now, create a simple background
        this.add.rectangle(0, 0, 800, 600, 0x55aa55).setOrigin(0, 0);
        
        // Placeholder for future map implementation:
        /*
        this.map = this.make.tilemap({ key: 'map' });
        const tileset = this.map.addTilesetImage('tileset', 'tiles');
        this.groundLayer = this.map.createLayer('Ground', tileset);
        this.wallsLayer = this.map.createLayer('Walls', tileset);
        this.wallsLayer.setCollisionByProperty({ collides: true });
        */
    }

    createLocalPlayer() {
        const startX = Math.random() * 700 + 50;
        const startY = Math.random() * 500 + 50;
        this.localPlayer = new Player(this, startX, startY, 'character', socket.id, 'Player');
        this.players.set(socket.id, this.localPlayer);
    }

    setupSocketHandlers() {
        socket.on('player_joined', (data) => {
            if (!this.players.has(data.id)) {
                const newPlayer = new Player(
                    this,
                    data.x || Math.random() * 700 + 50,
                    data.y || Math.random() * 500 + 50,
                    'character',
                    data.id,
                    data.nickname
                );
                this.players.set(data.id, newPlayer);
            }
        });

        socket.on('player_moved', (data) => {
            const player = this.players.get(data.id);
            if (player && player !== this.localPlayer) {
                player.setPosition(data.x, data.y);
                player.play(data.animation, true);
            }
        });

        socket.on('player_left', (data) => {
            const player = this.players.get(data.id);
            if (player) {
                player.destroy();
                this.players.delete(data.id);
            }
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

    setupCollisions() {
        // This will be expanded when adding maps
        if (this.wallsLayer) {
            this.physics.add.collider(this.localPlayer, this.wallsLayer);
            this.players.forEach(player => {
                if (player !== this.localPlayer) {
                    this.physics.add.collider(player, this.wallsLayer);
                }
            });
        }
    }

    setupUI() {
        // Add room information
        this.add.text(16, 16, `Room: ${this.roomId}`, {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 3 }
        });

        // Add player count
        this.playerCountText = this.add.text(16, 40, `Players: ${this.players.size}`, {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 3 }
        });
    }

    update() {
        if (this.localPlayer && this.cursors) {
            // Update local player movement
            this.localPlayer.update(this.cursors);

            // Emit position to other players
            socket.emit('player_move', {
                x: this.localPlayer.x,
                y: this.localPlayer.y,
                animation: this.localPlayer.anims.currentAnim
                    ? this.localPlayer.anims.currentAnim.key
                    : 'idle'
            });
        }

        // Update player count
        if (this.playerCountText) {
            this.playerCountText.setText(`Players: ${this.players.size}`);
        }
    }
}
