class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
    }

    preload() {
        this.load.html('loginform', 'assets/login.html');
        this.load.image('background', 'assets/login-background.png');
    }

    create() {
        // Add background
        this.add.image(400, 300, 'background');

        // Add login form
        const element = this.add.dom(400, 300).createFromCache('loginform');
        
        element.addListener('click');
        element.on('click', (event) => {
            if (event.target.name === 'loginButton') {
                const nickname = element.getChildByName('nickname').value;
                const roomId = element.getChildByName('roomId').value;
                const isHost = element.getChildByName('createRoom').checked;

                if (nickname && roomId) {
                    if (isHost) {
                        socket.emit('create_room', { roomId, nickname });
                    } else {
                        socket.emit('join_room', { roomId, nickname });
                    }
                }
            }
        });

        // Handle room creation/joining responses
        socket.on('room_created', (data) => {
            this.startGame(data.roomId, true);
        });

        socket.on('room_joined', (data) => {
            this.startGame(data.roomId, false);
        });

        socket.on('error', (data) => {
            // Show error message
            this.add.text(400, 500, data.message, {
                color: '#ff0000'
            }).setOrigin(0.5);
        });
    }

    startGame(roomId, isHost) {
        this.scene.start('GameScene', { roomId, isHost });
    }
}