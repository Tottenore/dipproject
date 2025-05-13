console.log('Loading config...');

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: [LoginScene, RoomScene, GameScene],
    callbacks: {
        preBoot: function (game) {
            // Добавляем проверку готовности сокета
            if (!window.socket) {
                console.warn('Socket not initialized during game pre-boot');
            }
        }
    }
};

console.log('Config loaded');