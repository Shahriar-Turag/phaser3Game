import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { buttonConfig, mobileControlsConfig } from "./button-config";

const Phaser3ReactGame: React.FC = () => {
    const phaserGameRef = useRef<HTMLDivElement>(null);
    const [showButton, setShowButton] = useState(true);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    let leftPressed = false;
    let rightPressed = false;
    let jumpPressed = false;

    useEffect(() => {
        let game: Phaser.Game;
        let internalScore = 0;

        if (!showButton && phaserGameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 800,
                height: 600,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: "arcade",
                    arcade: {
                        gravity: { x: 0, y: 300 },
                        debug: false,
                    },
                },
                scene: {
                    preload,
                    create,
                    update,
                },
                parent: phaserGameRef.current,
            };

            game = new Phaser.Game(config);
        }

        let player: Phaser.Physics.Arcade.Sprite,
            stars: Phaser.Physics.Arcade.Group,
            bombs: Phaser.Physics.Arcade.Group,
            platforms: Phaser.Physics.Arcade.StaticGroup,
            cursors: Phaser.Types.Input.Keyboard.CursorKeys,
            scoreText: Phaser.GameObjects.Text;

        function preload(this: Phaser.Scene) {
            this.load.image("sky", "/assets/sky.png");
            this.load.image("ground", "/assets/platform.png");
            this.load.image("star", "/assets/star.png");
            this.load.image("bomb", "/assets/bomb.png");
            this.load.spritesheet("dude", "/assets/dude.png", {
                frameWidth: 32,
                frameHeight: 48,
            });
        }

        function create(this: Phaser.Scene) {
            this.add.image(400, 300, "sky");

            platforms = this.physics.add.staticGroup();
            platforms.create(400, 568, "ground").setScale(2).refreshBody();
            platforms.create(600, 400, "ground");
            platforms.create(50, 250, "ground");
            platforms.create(750, 220, "ground");

            player = this.physics.add.sprite(100, 450, "dude");
            player.setBounce(0.2);
            player.setCollideWorldBounds(true);

            this.physics.add.collider(player, platforms);

            // Adding Animations for the 'dude' sprite
            this.anims.create({
                key: "left",
                frames: this.anims.generateFrameNumbers("dude", {
                    start: 0,
                    end: 3,
                }),
                frameRate: 10,
                repeat: -1,
            });

            this.anims.create({
                key: "turn",
                frames: [{ key: "dude", frame: 4 }],
                frameRate: 20,
            });

            this.anims.create({
                key: "right",
                frames: this.anims.generateFrameNumbers("dude", {
                    start: 5,
                    end: 8,
                }),
                frameRate: 10,
                repeat: -1,
            });

            stars = this.physics.add.group({
                key: "star",
                repeat: 11,
                setXY: { x: 12, y: 0, stepX: 70 },
            });

            stars.children.iterate((child) => {
                (child as Phaser.Physics.Arcade.Image).setBounceY(
                    Phaser.Math.FloatBetween(0.4, 0.8)
                );
            });

            this.physics.add.collider(stars, platforms);
            this.physics.add.overlap(
                player,
                stars,
                collectStar,
                undefined,
                this
            );

            bombs = this.physics.add.group();
            this.physics.add.collider(bombs, platforms);
            this.physics.add.collider(player, bombs, hitBomb, undefined, this);

            cursors = this.input.keyboard.createCursorKeys();

            scoreText = this.add.text(16, 16, "Score: 0", {
                fontSize: "32px",
                color: "#000",
            });

            const isMobile = window.innerWidth <= 768;
            console.log("isMobile", isMobile);

            if (isMobile) {
                const buttonSize = 30;
                const platformY = platforms.children.entries[0].y;
                const buttonY = platformY - buttonSize - -30; // Position buttons just above the ground

                // Left Button
                const leftButton = this.add
                    .text(100, buttonY, "⬅", mobileControlsConfig)
                    .setInteractive()
                    .on("pointerdown", () => {
                        leftPressed = true;
                    })
                    .on("pointerup", () => {
                        leftPressed = false;
                    })
                    .on("pointerout", () => {
                        leftPressed = false;
                    })
                    .setOrigin(0.5);

                // Right Button
                const rightButton = this.add
                    .text(250, buttonY, "➡", mobileControlsConfig)
                    .setInteractive()
                    .on("pointerdown", () => {
                        rightPressed = true;
                    })
                    .on("pointerup", () => {
                        rightPressed = false;
                    })
                    .on("pointerout", () => {
                        rightPressed = false;
                    })
                    .setOrigin(0.5);

                // Jump Button
                const jumpButton = this.add
                    .text(
                        this.scale.width - 100,
                        buttonY,
                        "⬆",
                        mobileControlsConfig
                    )
                    .setInteractive()
                    .on("pointerdown", () => {
                        jumpPressed = true;
                    })
                    .on("pointerup", () => {
                        jumpPressed = false;
                    })
                    .on("pointerout", () => {
                        jumpPressed = false;
                    })
                    .setOrigin(0.5);
            }
        }

        function update() {
            if (cursors.left?.isDown || leftPressed) {
                player.setVelocityX(-160);
                player.anims.play("left", true);
            } else if (cursors.right?.isDown || rightPressed) {
                player.setVelocityX(160);
                player.anims.play("right", true);
            } else {
                player.setVelocityX(0);
                player.anims.play("turn");
            }

            if (
                (cursors.up?.isDown || jumpPressed) &&
                player.body?.touching.down
            ) {
                player.setVelocityY(-330);
                jumpPressed = false; // Prevents multiple jumps while holding
            }
        }

        function collectStar(
            player: Phaser.GameObjects.GameObject,
            star: Phaser.GameObjects.GameObject
        ) {
            (star as Phaser.Physics.Arcade.Image).disableBody(true, true);
            internalScore += 10;
            scoreText.setText("Score: " + internalScore);

            if (stars.countActive(true) === 0) {
                stars.children.iterate((child) => {
                    (child as Phaser.Physics.Arcade.Image).enableBody(
                        true,
                        child.x,
                        0,
                        true,
                        true
                    );
                });

                const x =
                    player.x < 400
                        ? Phaser.Math.Between(400, 800)
                        : Phaser.Math.Between(0, 400);

                const bomb = bombs.create(x, 16, "bomb");
                bomb.setBounce(1);
                bomb.setCollideWorldBounds(true);
                bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
            }
        }

        function hitBomb(
            player: Phaser.GameObjects.GameObject,
            bomb: Phaser.GameObjects.GameObject
        ) {
            this.physics.pause();
            (player as Phaser.Physics.Arcade.Sprite).setTint(0xff0000);
            setScore(internalScore);
            setGameOver(true);
            setShowButton(true);
        }

        return () => {
            if (game) game.destroy(true);
        };
    }, [showButton]);

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
            <img
                src="/assets/sky.png"
                alt="background"
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    zIndex: -1,
                }}
            />
            {/* using the button style from button config */}
            {showButton && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                    }}
                >
                    {gameOver && (
                        <h2 style={{ color: "#fff" }}>Final Score: {score}</h2>
                    )}
                    <button
                        style={{
                            ...buttonConfig.buttonStyle,
                        }}
                        onClick={() => {
                            setScore(0);
                            setGameOver(false);
                            setShowButton(false);
                        }}
                    >
                        Start Game
                    </button>
                </div>
            )}
            <div ref={phaserGameRef} className="w-full h-full" />
        </div>
    );
};

export default Phaser3ReactGame;

