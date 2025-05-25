// Глобальные переменные
window.socket = null;
window.game = null;
window.otherPlayers = {}; // Глобальный список других игроков
window.showDebugGraphics = false;
const debugInfo = document.getElementById('debug-info');
let debugVisible = false;
debugInfo.style.display = debugVisible ? 'block' : 'none';


document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.code === 'KeyX') {
        debugVisible = !debugVisible;
        if (debugInfo) {
            debugInfo.style.display = debugVisible ? 'block' : 'none';
        }

        const gameScene = window.game && window.game.scene && window.game.scene.keys && window.game.scene.keys.GameScene;
        if (gameScene && gameScene.physics && gameScene.physics.world) {
            const world = gameScene.physics.world;
            world.debug = !world.debug;
            world.drawDebug = world.debug;

            // Это важно для Phaser 3.55.2!
            if (world.debugGraphic) {
                world.debugGraphic.clear();
                world.debugGraphic.visible = world.debug;
            }

            // Перерисовать debug (особенно важно при включении снова)
            world.createDebugGraphic();

            updateDebug('Phaser physics debug: ' + (world.debug ? 'ON' : 'OFF'));
        }
    }
});

// Функция для отладки
function updateDebug(message) {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.innerHTML += `<br>${message}`;
    }
    console.log(Phaser.VERSION);
    console.log(message);
}

// Функция инициализации игры
function initGame() {
    updateDebug('Initializing game...');

    // Сначала инициализируем Socket.IO
    window.socket = io('http://localhost:3000');

    window.socket.on('connect', () => {
        updateDebug('Connected to server');
        
        // Только после подключения сокета создаем игру
        try {
            window.game = new Phaser.Game(config);
            updateDebug('Game created successfully');
        } catch (error) {
            console.error('Error creating game:', error);
            updateDebug(`Error creating game: ${error.message}`);
        }
    });

    window.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateDebug(`Connection error: ${error.message}`);
    });

    // --- Глобальная обработка информации о других игроках ---

    // Получаем список всех уже подключённых при входе в комнату
    window.socket.on('existing_players', (players) => {
        updateDebug('[existing_players] ' + JSON.stringify(players));
        window.otherPlayers = {};
        players.forEach(player => {
            window.otherPlayers[player.id] = player;
            updateDebug('Добавлен существующий игрок: ' + player.nickname + ' (' + player.id + ')');
        });
    });

    // Добавляем нового игрока, когда кто-то подключился
    window.socket.on('player_joined', (player) => {
        window.otherPlayers[player.id] = player;
        updateDebug('Добавлен новый игрок: ' + player.nickname + ' (' + player.id + ')');
    });

    // Удаляем игрока, когда кто-то выходит
    window.socket.on('player_left', (data) => {
        if (window.otherPlayers[data.id]) {
            updateDebug('Игрок вышел: ' + data.id);
            delete window.otherPlayers[data.id];
        }
    });
}

window.createRoom = function() {
    if (!window.socket) {
        updateDebug('Error: Socket not initialized');
        return;
    }
    
    const nickname = document.getElementById('nickname').value;
    if (nickname) {
        const roomId = Math.random().toString(36).substring(7);
        updateDebug(`Creating room: ${roomId}`);
        window.socket.emit('create_room', { roomId, nickname });
    } else {
        alert('Please enter a nickname');
    }
};

window.joinRoom = function() {
    if (!window.socket) {
        updateDebug('Error: Socket not initialized');
        return;
    }

    const nickname = document.getElementById('nickname').value;
    if (nickname) {
        const roomId = prompt('Enter room ID:');
        if (roomId) {
            updateDebug(`Joining room: ${roomId} (1-й заход)`);
            window.socket.emit('join_room', { roomId, nickname });

            setTimeout(() => {
                updateDebug(`Joining room: ${roomId} (2-й заход)`);
                window.socket.emit('join_room', { roomId, nickname });
            }, 200);
        }
    } else {
        alert('Please enter a nickname');
    }
};

window.showPlayersList = function() {
    let list = 'Игроки в комнате:<br>';
    for (let id in window.otherPlayers) {
        list += window.otherPlayers[id].nickname + ' (' + id + ')<br>';
    }
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) debugInfo.innerHTML += `<br>${list}`;
};

window.onload = initGame;