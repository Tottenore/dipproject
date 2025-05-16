class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, nickname) {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.id = id;
        this.nickname = nickname;
        this.speed = 175;

        this.setCollideWorldBounds(true);
        this.lastDirection = 'down';

        this.nicknameText = scene.add.text(x, y - 35, nickname, {
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 1 }
        }).setOrigin(0.5);

        this.createAnimations(scene);
    }

    createAnimations(scene) {
        const createAnim = (key, frames, frameRate = 8) => {
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key: key,
                    frames: scene.anims.generateFrameNumbers('character', { 
                        start: frames.start, 
                        end: frames.end 
                    }),
                    frameRate: frameRate,
                    repeat: -1
                });
            }
        };

        try {
            createAnim('walk_down', { start: 0, end: 2 });
            createAnim('walk_left', { start: 3, end: 5 });
            createAnim('walk_right', { start: 6, end: 8 });
            createAnim('walk_up', { start: 9, end: 11 });
        } catch (error) {
            console.error('Error creating player animations:', error);
        }
    }

    

    update(cursors, wasd) {
        let velocityX = 0;
        let velocityY = 0;
        let newDirection = this.lastDirection;

        if (cursors.left.isDown || wasd.left.isDown) {
            velocityX = -this.speed;
            this.play('walk_left', true);
            newDirection = 'left';
        } else if (cursors.right.isDown || wasd.right.isDown) {
            velocityX = this.speed;
            this.play('walk_right', true);
            newDirection = 'right';
        }

        if (cursors.up.isDown || wasd.up.isDown) {
            velocityY = -this.speed;
            if (velocityX === 0) this.play('walk_up', true);
            newDirection = 'up';
        } else if (cursors.down.isDown || wasd.down.isDown) {
            velocityY = this.speed;
            if (velocityX === 0) this.play('walk_down', true);
            newDirection = 'down';
        }

        this.lastDirection = newDirection;

        this.setVelocity(velocityX, velocityY);

        if (velocityX === 0 && velocityY === 0) {
            this.stop();
            this.setIdleFrame();
        }

        if (this.nicknameText) {
            this.nicknameText.setPosition(this.x, this.y - 35);
        }
    }

    setIdleFrame() {
        let idleFrame = 0;
        switch (this.lastDirection) {
            case 'down': idleFrame = 0; break;
            case 'left': idleFrame = 3; break;
            case 'right': idleFrame = 6; break;
            case 'up': idleFrame = 9; break;
        }
        this.setFrame(idleFrame);
    }

    destroy() {
        if (this.nicknameText) {
            this.nicknameText.destroy();
        }
        super.destroy();
    }
}