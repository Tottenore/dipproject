class RoomScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RoomScene' });
    }

    create() {
        console.log('RoomScene created');
        this.add.text(400, 300, 'Room Scene', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);
    }
}