// Глобальные переменные
window.socket = null;
window.game = null;

// Функция для отладки
function updateDebug(message) {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.innerHTML += `<br>${message}`;
    }
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
}

// Функции для кнопок
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
            updateDebug(`Joining room: ${roomId}`);
            window.socket.emit('join_room', { roomId, nickname });
        }
    } else {
        alert('Please enter a nickname');
    }
};

// Запускаем инициализацию после загрузки страницы
window.onload = initGame;