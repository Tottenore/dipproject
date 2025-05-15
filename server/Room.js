class Room {
    constructor(id) {
        this.id = id;
        this.players = new Map();
    }

    addPlayer(playerId, nickname) {
        this.players.set(playerId, {
            nickname,
            x: Math.random() * 800,
            y: Math.random() * 600
        });
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    getPlayers() {
        return Array.from(this.players.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    isEmpty() {
        return this.players.size === 0;
    }
}

module.exports = Room;