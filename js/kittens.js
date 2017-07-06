"use strict";
// Changelog
// -Added Lives (froze score, displayed lives, changed color)
// -Added invincibility
// -Added WASD codes, adapted left-right
// -Added restart (on space)
// -Implemented up / down moves
// -Increased Canvas, added score section
// -Added difficulty gradient


// This sectin contains some game constants. It is not super interesting
var APP_WIDTH = 850;
var APP_HEIGHT = 700
var GAME_WIDTH = 600;
var GAME_HEIGHT = APP_HEIGHT;

var ENEMY_WIDTH = 75;
var ENEMY_HEIGHT = 156;
var MAX_ENEMIES = (GAME_WIDTH / ENEMY_WIDTH) - 3;

var PLAYER_WIDTH = 75;
var PLAYER_HEIGHT = 54;

var BONUS_WIDTH = 75;
var BONUS_HEIGHT = 54;

// These two constants keep us from using "magic numbers" in our code
var LEFT_ARROW_CODE = 37;
var RIGHT_ARROW_CODE = 39;
var UP_ARROW_CODE = 38;
var DOWN_ARROW_CODE = 40;
// Can't be a gamer without WASD
var W_CODE = 87;
var A_CODE = 65;
var S_CODE = 83;
var D_CODE = 68;
// The Jesus key
var SPACEBAR_CODE = 32;

// These constants allow us to DRY
var MOVE_LEFT = 'left';
var MOVE_RIGHT = 'right';
var MOVE_UP = 'up';
var MOVE_DOWN = 'down';

// Preload game images
var images = {};
['enemy.png', 'stars.png', 'player.png', 'NetSpace5.png'].forEach(imgName => {
    var img = document.createElement('img');
    img.src = 'images/' + imgName;
    images[imgName] = img;
});





// This section is where you will be doing most of your coding
class Entity {
    constructor() {
        this.horizontalSpeed = 0;
        this.verticalSpeed = 0;
    }
    
    render(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y);
    }
    
    update(timeDiff) {
        this.x = this.x + timeDiff * this.horizontalSpeed;
        this.y = this.y + timeDiff * this.verticalSpeed;
    }
}

class Enemy extends Entity {
    constructor(xPos) {
        super();
        this.x = xPos;
        this.y = -ENEMY_HEIGHT;
        this.sprite = images['enemy.png'];

        // Each enemy should have a different speed
        this.verticalSpeed = Math.random() / 2 + 0.25; //goes from .25 to .75
    }
}

class Bonus extends Entity {
    constructor(xPos) {
        super();
        this.x = xPos;
        this.y = GAME_HEIGHT;
        this.sprite = images['player.png'];

        // Each enemy should have a different speed
        this.verticalSpeed = -(Math.random() / 2); //goes from .25 to .75
    }
}   


class Player extends Entity {
    constructor() {
        super();
        this.x = GAME_WIDTH/2 - PLAYER_WIDTH/2;
        this.y = GAME_HEIGHT - PLAYER_HEIGHT - 50;
        this.sprite = images['player.png'];
        this.lives = 3;
        this.invincibleScore = 0;
    }

    // This method is called by the game engine when left/right arrows are pressed
    move(direction) {
        if (direction === MOVE_LEFT && this.x > 0) {
            if (this.horizontalSpeed > 0) {
                this.horizontalSpeed = -.1;
            }
            else if (this.horizontalSpeed >= -.8) {
                this.horizontalSpeed -= .05;
            }
        }
        else if (direction === MOVE_RIGHT && ((this.x + PLAYER_WIDTH) < GAME_WIDTH)) {
            if (this.horizontalSpeed < 0) {
                this.horizontalSpeed = .1;
            }
            else if (this.horizontalSpeed <= .8) {
                this.horizontalSpeed += .05;
            }
        }
        else if (direction === MOVE_UP && this.y > 0) {
            if (this.verticalSpeed > 0) {
                this.verticalSpeed -= .1;
            }
            else if (this.verticalSpeed >= -.6) {
                this.verticalSpeed -= .05;
            }
        }
        else if (direction === MOVE_DOWN && ((this.y + PLAYER_HEIGHT) < GAME_HEIGHT)) {
            if (this.verticalSpeed < 0) {
                this.verticalSpeed += .1;
            }
            else if (this.verticalSpeed < .6) {
                this.verticalSpeed += .05;
            }
        }
    }
    
    //Not DRYed!
    updateHorizontal(timeDiff) {
        if (((this.x + timeDiff * this.horizontalSpeed) <= 0) && ((this.x + PLAYER_WIDTH + timeDiff * this.horizontalSpeed) >= GAME_WIDTH)) {
            this.horizontalSpeed = 0;
        }
        // Correctly stick to the side borders
        if (Math.floor(this.x) < 0) {
            this.x = 0;
            if (this.horizontalSpeed < 0) {
                this.horizontalSpeed = 0;
            }
        }
        else if (Math.floor(this.x) + PLAYER_WIDTH >= GAME_WIDTH) {
            this.x = GAME_WIDTH-PLAYER_WIDTH;
            if (this.horizontalSpeed > 0) {
                this.horizontalSpeed = 0;
            }
        }
        //console.log("X=" + this.x + " HSpeed=" + this.horizontalSpeed);
        this.update(timeDiff);
    }
    
    //Not DRYed!
    updateVertical(timeDiff) {
        if ((this.y + timeDiff * this.verticalSpeed <= 0) || (this.y + PLAYER_HEIGHT + timeDiff * this.verticalSpeed >= GAME_HEIGHT)) {
            this.verticalSpeed = 0;
        }
        
        if (Math.floor(this.y) < 0) {
            this.y = 0;
        }
        else if (Math.floor(this.y) + PLAYER_HEIGHT >= GAME_HEIGHT) {
            this.y = GAME_HEIGHT - PLAYER_HEIGHT;
        }
        
        this.update(timeDiff);
    }
}





/*
This section is a tiny game engine.
This engine will use your Enemy and Player classes to create the behavior of the game.
The engine will try to draw your game at 60 frames per second using the requestAnimationFrame function
*/
class Engine {
    constructor(element) {
        // Setup the player
        this.player = new Player();
        this.currentMaxEnemies = 1;
        this.currentMaxBonuses = 1;
        // Setup enemies, making sure there are always three
        this.setupEnemies();
        this.setupBonuses();

        // Setup the <canvas> element where we will be drawing
        var canvas = document.createElement('canvas');
        canvas.width = APP_WIDTH;
        canvas.height = APP_HEIGHT;
        element.appendChild(canvas);

        this.ctx = canvas.getContext('2d');

        // Since gameLoop will be called out of context, bind it once here.
        this.gameLoop = this.gameLoop.bind(this);
    }

    /*
     The game allows for 5 horizontal slots where an enemy can be present.
     At any point in time there can be at most MAX_ENEMIES enemies otherwise the game would be impossible
     */
    setupEnemies() {
        if (!this.enemies) {
            this.enemies = [];
        }

        while (this.enemies.filter(e => !!e).length < this.currentMaxEnemies) {
            this.addEnemy();
        }
    }


    // This method finds a random spot where there is no enemy, and puts one in there
    addEnemy() {
        var enemySpots = GAME_WIDTH / ENEMY_WIDTH;
        //console.log(enemySpots);
        var enemySpot;
        // Keep looping until we find a free enemy spot at random
        while (enemySpot === undefined || this.enemies[enemySpot]) {
            enemySpot = Math.floor(Math.random() * enemySpots);
        }

        this.enemies[enemySpot] = new Enemy(enemySpot * ENEMY_WIDTH);
    }

    
    setupBonuses() {
        if (!this.bonuses) {
            this.bonuses = [];
        }

        while (this.bonuses.filter(e => !!e).length < this.currentMaxBonuses) {
            this.addBonus();
        }
    }
    
    addBonus() {
        var bonusSpots = GAME_WIDTH / BONUS_WIDTH;
        var bonusSpot;
        // Keep looping until we find a free bonus spot at random
        while (bonusSpot === undefined || this.bonuses[bonusSpot]) {
            bonusSpot = Math.floor(Math.random() * bonusSpots);
        }

        this.bonuses[bonusSpot] = new Bonus(bonusSpot * BONUS_WIDTH);
    }

    // This method kicks off the game
    start(reboot) {
        this.score = 0;
        this.lastFrame = Date.now();
        //console.log("Reboot = " + reboot);
        //Check if first time loading
        if (!reboot) {
            // Listen for keyboard left/right (or WASD equivalent) and update the player
            document.addEventListener('keydown', e => {
                if (e.keyCode === LEFT_ARROW_CODE || e.keyCode === A_CODE) {
                    this.player.move(MOVE_LEFT);
                }
                else if (e.keyCode === RIGHT_ARROW_CODE || e.keyCode === D_CODE) {
                    this.player.move(MOVE_RIGHT);
                }
                else if (e.keyCode === UP_ARROW_CODE || e.keyCode === W_CODE) {
                    this.player.move(MOVE_UP);
                }
                else if (e.keyCode === DOWN_ARROW_CODE || e.keyCode === S_CODE) {
                    this.player.move(MOVE_DOWN);
                }
                else if ((e.keyCode === SPACEBAR_CODE)) {
                    if (this.isPlayerDead()) {
                        reboot = true; //flag to prevent re-adding listeners
                        this.player.lives = 3; // Reset lives! Duh!
                        this.player.invincibleScore = 2000; // Allow the player to find his composure
                        this.currentMaxEnemies = 1;
                        this.start(reboot);
                        //console.log(reboot);
                    }
                }
            });
        }
        //this.player.render(this.ctx); // draw the player
        this.gameLoop();
    }

    /*
    This is the core of the game engine. The `gameLoop` function gets called ~60 times per second
    During each execution of the function, we will update the positions of all game entities
    It's also at this point that we will check for any collisions between the game entities
    Collisions will often indicate either a player death or an enemy kill

    In order to allow the game objects to self-determine their behaviors, gameLoop will call the `update` method of each entity
    To account for the fact that we don't always have 60 frames per second, gameLoop will send a time delta argument to `update`
    You should use this parameter to scale your update appropriately
     */
    gameLoop() {
        // Check how long it's been since last frame
        var currentFrame = Date.now();
        var timeDiff = currentFrame - this.lastFrame;
        
        //Check if player's invincible
        if (this.player.invincibleScore > 0) {
            this.player.invincibleScore -= timeDiff;
            //Red score line too show dmg!
            this.ctx.fillStyle = '#ff0000';
        } 
        else {
            // Increase the score only if not invincible!
            this.ctx.fillStyle = '#ffffff';
            this.score += timeDiff;
        }
        //console.log("TimeDiff = " + timeDiff);
        // Call update on all enemies
        this.enemies.forEach(enemy => enemy.update(timeDiff));
        this.bonuses.forEach(bonus => bonus.update(timeDiff));
        this.player.updateHorizontal(timeDiff);
        this.player.updateVertical(timeDiff);
        this.updateDifficulty();

        // Draw everything!
        
        this.ctx.drawImage(images['NetSpace5.png'], 0, 0); // draw the star bg
        this.ctx.drawImage(images['stars.png'], GAME_WIDTH, 0); // Draw score section
        this.enemies.forEach(enemy => enemy.render(this.ctx)); // draw the enemies
        this.bonuses.forEach(bonus => bonus.render(this.ctx)); // draw the bonuses
        this.player.render(this.ctx); // draw the player

        // Check if any enemies should die
        this.enemies.forEach((enemy, enemyIdx) => {
            if (enemy.y > GAME_HEIGHT) {
                delete this.enemies[enemyIdx];
            }
        });
        this.setupEnemies();
        
        // Check if any bonuses should die
        this.bonuses.forEach((bonus, bonusIdx) => {
            if (bonus.y + BONUS_HEIGHT < 0) {
                delete this.bonuses[bonusIdx];
            }
        });
        this.setupBonuses();

        // Check if player is dead
        if (this.isPlayerDead()) {
            // If they are dead, then it's game over!
            this.ctx.font = 'bold 30px Impact';
            this.ctx.fillText(this.score + ' GAME OVER', GAME_WIDTH + 5, 30);
            this.ctx.fillText('Press Space to Restart', GAME_WIDTH/2, GAME_HEIGHT / 2);
        }
        else {
            // If player is not dead, then draw the score
            this.ctx.font = 'bold 30px Impact';
            this.ctx.fillText(this.score, GAME_WIDTH + 5, 30);
            this.ctx.fillText('Lives: ' + this.player.lives, APP_WIDTH - 100, 30);
            // Set the time marker and redraw
            this.lastFrame = Date.now();
            requestAnimationFrame(this.gameLoop);
            this.checkBonusPicked();
        }
    }

    isPlayerDead() {
        for (var i in this.enemies) {
            //Check if player is invincible
            if (this.player.invincibleScore <= 0) {
                //Check if the enemy is in the same column as the player
                if ((this.player.x < (this.enemies[i].x + ENEMY_WIDTH)) && ((this.player.x + PLAYER_WIDTH) > this.enemies[i].x )) {
                    //check if the player's length is overlapping the matching column's enemy length
                    // if [player's y] < [enemy's y+height] && [player's y+height] > [enemy's y], then there's an overlap
                    // Added 50 pixels to remove the rainbow from the hitbox
                    if ((this.player.y < (this.enemies[i].y+ENEMY_HEIGHT)) && ((this.player.y+PLAYER_HEIGHT) > this.enemies[i].y + 50)) {
                        if (this.player.lives > 0) {
                            this.player.lives--; //Lose a life
                            // Be invincibleScore for 1000 scores
                            this.player.invincibleScore = 1000;
                            
                            if (this.currentMaxBonuses < 2) {
                                this.currentMaxBonuses++;
                            }
                        }
                        else {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    //NOT DRYed!!
    checkBonusPicked() {
        for (var i in this.bonuses) {
            if ((this.player.x < (this.bonuses[i].x + BONUS_WIDTH)) && ((this.player.x + PLAYER_WIDTH) > this.bonuses[i].x )) {
                if ((this.player.y < (this.bonuses[i].y+BONUS_HEIGHT)) && ((this.player.y+PLAYER_HEIGHT) > this.bonuses[i].y)) {
                    if (this.player.lives > 0) {
                        this.player.lives++; //Gain a life
                        delete this.bonuses[i];
                        //reduce the max bonuses
                        //this.currentMaxBonuses--;
                    }
                }
            }
        }
    }
    
    
    //Not DRYed!
    updateDifficulty() {
        if (this.currentMaxEnemies <= MAX_ENEMIES) { 
            this.currentMaxEnemies = Math.ceil(this.score / 10000);
            this.currentMaxBonuses = Math.floor(Math.random() * this.currentMaxEnemies / 2);
            //console.log("CurrentMaxE=" + this.currentMaxEnemies + " Score=" + this.score);
        }
        
    }
}





// This section will start the game
var gameEngine = new Engine(document.getElementById('app'));
gameEngine.start(false);