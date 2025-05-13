class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, nickname) {
        super(scene, x, y, texture);
        
        // Добавляем спрайт на сцену и включаем физику
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Сохраняем дополнительные данные
        this.id = id;
        this.nickname = nickname;
        this.speed = 175;

        // Настраиваем физические свойства
        this.setCollideWorldBounds(true);

        // Добавляем текст с никнеймом над игроком
        this.nicknameText = scene.add.text(x, y - 20, nickname, {
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 1 }
        }).setOrigin(0.5);

        // Создаем анимации для игрока
        this.createAnimations(scene);
    }

    createAnimations(scene) {
        // Создаем анимации для движения
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

    update(cursors) {
        if (!cursors) return;

        let velocityX = 0;
        let velocityY = 0;

        // Обработка движения
        if (cursors.left.isDown) {
            velocityX = -this.speed;
            this.play('walk_left', true);
        } else if (cursors.right.isDown) {
            velocityX = this.speed;
            this.play('walk_right', true);
        }

        if (cursors.up.isDown) {
            velocityY = -this.speed;
            if (velocityX === 0) this.play('walk_up', true);
        } else if (cursors.down.isDown) {
            velocityY = this.speed;
            if (velocityX === 0) this.play('walk_down', true);
        }

        // Применяем скорость
        this.setVelocity(velocityX, velocityY);

        // Останавливаем анимацию, если нет движения
        if (velocityX === 0 && velocityY === 0) {
            this.stop();
        }

        // Обновляем позицию текста с никнеймом
        if (this.nicknameText) {
            this.nicknameText.setPosition(this.x, this.y - 20);
        }
    }

    destroy() {
        // Удаляем текст с никнеймом при удалении игрока
        if (this.nicknameText) {
            this.nicknameText.destroy();
        }
        super.destroy();
    }
}