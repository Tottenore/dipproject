class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
        this.sceneStarted = false; // Флаг для защиты от повторного старта
    }

    create() {
        updateDebug('LoginScene create method starting...');
        
        // Заполняем сцену контентом
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Добавляем фон
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x6666ff)
            .setOrigin(0, 0);

        // Добавляем текст
        this.add.text(centerX, centerY - 100, 'Login Scene', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Добавляем текст с инструкцией
        this.add.text(centerX, centerY, 'Enter nickname and click Create/Join Room', {
            fontSize: '20px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Добавляем обработчики событий сокета
        this.setupSocketHandlers();

        updateDebug('LoginScene create method completed');
    }

    setupSocketHandlers() {
        if (!window.socket) {
            updateDebug('Waiting for socket initialization...');
            // Ждем инициализации сокета
            const checkSocket = setInterval(() => {
                if (window.socket) {
                    updateDebug('Socket initialized, setting up handlers');
                    this.addSocketHandlers();
                    clearInterval(checkSocket);
                }
            }, 100);
        } else {
            this.addSocketHandlers();
        }
    }

    addSocketHandlers() {
        // Удаляем старые обработчики, если они есть
        window.socket.off('room_created');
        window.socket.off('room_joined');
        window.socket.off('error');

        socket.on('room_created', (data) => {
            this.tryStartGame(data.roomId, true);
        });

        socket.on('room_joined', (data) => {
            this.tryStartGame(data.roomId, false);
        });
    }

    tryStartGame(roomId, isHost) {
        if (!this.sceneStarted) {
            this.sceneStarted = true;
            this.startGame(roomId, isHost);
        }
    }

    startGame(roomId, isHost) {
        updateDebug(`Starting game - Room: ${roomId}, Host: ${isHost}`);
        this.scene.start('GameScene', { roomId, isHost });
    }
}