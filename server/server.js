const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Настраиваем статические пути
// Предполагая, что у вас есть папка client с файлами игры
app.use(express.static(path.join(__dirname, '../client')));

// Хранение состояния игры
const rooms = new Map();

// Константы
const MAX_PLAYERS_PER_ROOM = 10;
const INACTIVE_ROOM_TIMEOUT = 1000 * 60 * 60; // 1 час

// Функция очистки неактивных комнат
function cleanInactiveRooms() {
    const now = Date.now();
    for (const [roomId, roomData] of rooms.entries()) {
        if (roomData.players.size === 0 && (now - roomData.lastActivity) > INACTIVE_ROOM_TIMEOUT) {
            rooms.delete(roomId);
            console.log(`Удалена неактивная комната: ${roomId}`);
        }
    }
}

// Запускаем очистку неактивных комнат каждый час
setInterval(cleanInactiveRooms, INACTIVE_ROOM_TIMEOUT);

// Обработка подключений
io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);

    // Создание комнаты
    socket.on('create_room', (data) => {
        try {
            const { roomId, nickname } = data;

            // Валидация входных данных
            if (!roomId || !nickname) {
                socket.emit('error', { 
                    message: 'Отсутствует ID комнаты или никнейм' 
                });
                return;
            }

            // Проверка существования комнаты
            if (rooms.has(roomId)) {
                socket.emit('error', { 
                    message: 'Комната уже существует' 
                });
                return;
            }

            // Создание новой комнаты
            const roomData = {
                id: roomId,
                createdAt: new Date().toISOString(),
                lastActivity: Date.now(),
                players: new Map(),
                host: socket.id,
                settings: {
                    maxPlayers: MAX_PLAYERS_PER_ROOM,
                    gameMode: 'standard'
                }
            };

            rooms.set(roomId, roomData);
            socket.emit('room_created', { roomId });

            // Автоматически присоединяем создателя к комнате
            handleJoinRoom({ roomId, nickname }, socket);

            console.log(`Создана комната ${roomId} игроком ${nickname} (${socket.id})`);

        } catch (error) {
            console.error('Ошибка при создании комнаты:', error);
            socket.emit('error', { 
                message: 'Ошибка при создании комнаты' 
            });
        }
    });

    // Присоединение к комнате
    socket.on('join_room', (data) => handleJoinRoom(data, socket));

    // Обновление позиции игрока
    socket.on('player_move', (data) => {
        try {
            const { x, y, animation } = data;
            const roomId = socket.currentRoom;

            if (roomId && rooms.has(roomId)) {
                const roomData = rooms.get(roomId);
                
                // Обновляем позицию игрока
                if (roomData.players.has(socket.id)) {
                    const playerData = roomData.players.get(socket.id);
                    playerData.x = x;
                    playerData.y = y;
                    playerData.animation = animation;

                    // Отправляем обновление всем игрокам в комнате
                    socket.to(roomId).emit('player_moved', {
                        id: socket.id,
                        x,
                        y,
                        animation
                    });
                }

                roomData.lastActivity = Date.now();
            }
        } catch (error) {
            console.error('Ошибка при обновлении позиции:', error);
        }
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        try {
            const roomId = socket.currentRoom;
            if (roomId && rooms.has(roomId)) {
                const roomData = rooms.get(roomId);
                
                // Удаляем игрока из комнаты
                if (roomData.players.has(socket.id)) {
                    roomData.players.delete(socket.id);
                    
                    // Уведомляем остальных игроков
                    socket.to(roomId).emit('player_left', {
                        id: socket.id
                    });
                    
                    // Обновляем счетчик игроков
                    io.to(roomId).emit('player_count_update', roomData.players.size);

                    // Если это был хост, назначаем нового
                    if (socket.id === roomData.host && roomData.players.size > 0) {
                        const newHost = roomData.players.values().next().value.id;
                        roomData.host = newHost;
                        io.to(roomId).emit('new_host', { id: newHost });
                    }

                    // Если комната пуста, помечаем время последней активности
                    if (roomData.players.size === 0) {
                        roomData.lastActivity = Date.now();
                    }
                }
            }
            console.log(`Клиент отключился: ${socket.id}`);
        } catch (error) {
            console.error('Ошибка при отключении:', error);
        }
    });
});

// Функция обработки присоединения к комнате
function handleJoinRoom(data, socket) {
    try {
        const { roomId, nickname } = data;
        
        // Валидация входных данных
        if (!roomId || !nickname) {
            socket.emit('error', { 
                message: 'Отсутствует ID комнаты или никнейм' 
            });
            return;
        }

        // Проверка существования комнаты
        if (!rooms.has(roomId)) {
            socket.emit('error', { 
                message: 'Комната не существует' 
            });
            return;
        }

        const roomData = rooms.get(roomId);
        
        // Проверка количества игроков
        if (roomData.players.size >= roomData.settings.maxPlayers) {
            socket.emit('error', { 
                message: 'Комната заполнена' 
            });
            return;
        }

        // Создаем данные игрока
        const playerData = {
            id: socket.id,
            nickname: nickname,
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            joinedAt: new Date().toISOString()
        };

        // Присоединяем к комнате
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.playerData = playerData;
        
        // Сохраняем данные игрока
        roomData.players.set(socket.id, playerData);
        roomData.lastActivity = Date.now();

        // Получаем список существующих игроков
        const existingPlayers = Array.from(roomData.players.values())
            .filter(player => player.id !== socket.id)
            .map(player => ({
                id: player.id,
                nickname: player.nickname,
                x: player.x,
                y: player.y
            }));

        // Отправляем данные новому игроку
        socket.emit('existing_players', existingPlayers);
        socket.emit('room_joined', {
            roomId,
            playerId: socket.id,
            isHost: roomData.host === socket.id, // Передаем статус хоста
            playerCount: roomData.players.size,
            settings: roomData.settings
        });
        
        // Уведомляем остальных
        socket.to(roomId).emit('player_joined', playerData);
        io.to(roomId).emit('player_count_update', roomData.players.size);

        console.log(`Игрок ${nickname} (${socket.id}) присоединился к комнате ${roomId}`);

    } catch (error) {
        console.error('Ошибка при присоединении к комнате:', error);
        socket.emit('error', { 
            message: 'Ошибка при присоединении к комнате' 
        });
    }
}

// Роут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});