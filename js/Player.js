class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, nickname) {
        super(scene, x, y, texture);
        
        this.id = id;
        this.nickname = nickname;
        this.scene = scene;
        
        // Add player to the scene
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Add nickname text above player
        this.nicknameText = scene.add.text(x, y - 20, nickname, {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 3 }
        }).setOrigin(0.5);

        // Setup animations
        this.setupAnimations();
    }

    setupAnimations() {
        // Walking animations
        const directions = ['down', 'left', 'right', 'up'];
        directions.forEach((direction, index) => {
            this.scene.anims.create({
                key: `walk-${direction}`,
                frames: this.scene.anims.generateFrameNumbers('character', {
                    start: index * 3,
                    end: (index * 3) + 2
                }),
                frameRate: 10,
                repeat: -1
            });
        });
    }

    update(cursors) {
        const speed = 200;
        let animation = 'idle';
        
        // Movement logic
        if (cursors) {
            const velocityX = (cursors.left.isDown ? -speed : 0) + (cursors.right.isDown ? speed : 0);
            const velocityY = (cursors.up.isDown ? -speed : 0) + (cursors.down.isDown ? speed : 0);
            
            this.setVelocity(velocityX, velocityY);
            
            // Animation logic
            if (velocityX < 0) animation = 'walk-left';
            else if (velocityX > 0) animation = 'walk-right';
            else if (velocityY < 0) animation = 'walk-up';
            else if (velocityY > 0) animation = 'walk-down';
            else this.anims.stop();

            if (animation !== 'idle') this.play(animation, true);
        }

        // Update nickname position
        this.nicknameText.setPosition(this.x, this.y - 20);
    }

    destroy() {
        this.nicknameText.destroy();
        super.destroy();
    }
}