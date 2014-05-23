/**
 * Playing Asteroids while learning JavaScript object model.
 */
/** 
 * Shim layer, polyfill, for requestAnimationFrame with setTimeout fallback.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();



/**
 * Shim layer, polyfill, for cancelAnimationFrame with setTimeout fallback.
 */
window.cancelRequestAnimFrame = (function () {
    return window.cancelRequestAnimationFrame ||
        window.webkitCancelRequestAnimationFrame ||
        window.mozCancelRequestAnimationFrame ||
        window.oCancelRequestAnimationFrame ||
        window.msCancelRequestAnimationFrame ||
        window.clearTimeout;
})();



/**
 * Trace the keys pressed
 * http://nokarma.org/2011/02/27/javascript-game-development-keyboard-input/index.html
 */
window.Key = {
    pressed: {},

    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    SPACE: 32,
    A: 65,
    S: 83,
    D: 68,
    w: 87,

    isDown: function (keyCode, keyCode1) {
        return this.pressed[keyCode] || this.pressed[keyCode1];
    },

    onKeydown: function (event) {
        this.pressed[event.keyCode] = true;
    },

    onKeyup: function (event) {
        delete this.pressed[event.keyCode];
    }
};
window.addEventListener('keyup', function (event) {
    Key.onKeyup(event);
}, false);
window.addEventListener('keydown', function (event) {
    Key.onKeydown(event);
}, false);



/**
 * All objects are Vectors
 */
function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vector.prototype = {
    muls: function (scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }, // Multiply with scalar
    imuls: function (scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }, // Multiply itself with scalar
    adds: function (scalar) {
        return new Vector(this.x + scalar, this.y + scalar);
    }, // Multiply with scalar
    iadd: function (vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    } // Add itself with Vector
}



/**
 * The forces around us.
 */
function Forces() {
    this.all = {};
}

Forces.prototype = {

    createAcceleration: function (vector) {
        return function (velocity, td) {
            velocity.iadd(vector.muls(td));
        }
    },

    createDamping: function (damping) {
        return function (velocity, td) {
            velocity.imuls(damping);
        }
    },

    createWind: function (vector) {
        return function (velocity, td) {
            velocity.iadd(vector.adds(td));
        }
    },

    addAcceleration: function (name, vector) {
        this.all[name] = this.createAcceleration(vector);
    },
    addDamping: function (name, damping) {
        this.all[name] = this.createDamping(damping);
    },
    addWind: function (name, vector) {
        this.all[name] = this.createWind(vector);
    },

    update: function (object, td) {
        for (var force in this.all) {
            if (this.all.hasOwnProperty(force)) {
                this.all[force](object, td);
            }
        }
    }

}

window.Forces = new Forces();
//window.Forces.addAcceleration('gravity', new Vector(0, 9.82));
window.Forces.addDamping('drag', 0.97);
//window.Forces.addWind('wind', new Vector(0.5, 0));

/**
 * A Player as an object.
 */
function Player(trackCount, width, height, position, velocity, speed, direction, accelerateForce, breakForce, dampForce) {
    this.height = height || 32;
    this.width = width || 32;
    this.position = position || new Vector();
    this.velocity = velocity || new Vector();
    this.speed = speed || new Vector();
    this.direction = direction || 0;
    this.accelerateForce = accelerateForce || Forces.createAcceleration(new Vector(80, 80));
    this.breakForce = breakForce || Forces.createDamping(0.97);
    this.dampForce = dampForce || Forces.createDamping(0.999);
    this.trackCount = trackCount;
}

Player.prototype = {

    draw: function (ct) {
        var x = this.width / 2,
            y = this.height / 2;

        var sprite = new Image(); // Create new img element
        sprite.src = 'img/mini4.png'; // Set source path

        var fumes = new Image(); // Create new img element
        fumes.src = 'img/fumes.png'; // Set source path

        ct.save();
        ct.translate(this.position.x, this.position.y);
        ct.rotate(this.direction + Math.PI / 2)
        ct.scale(0.5, 0.5);

        ct.beginPath();

        if (Key.isDown(Key.UP, Key.W)) {
            ct.drawImage(fumes, -16, 40);
        }

        if (Key.isDown(Key.DOWN, Key.S)) {
            ct.moveTo(y + 4, 46);
            ct.arc(0, 46, y + 2, 1 * Math.PI, 2 * Math.PI, true);
        }

        ct.strokeStyle = "#990000";
        ct.lineWidth = 5;
        ct.stroke();

        ct.drawImage(sprite, -16, 1);

        ct.restore();
    },


    moveForward: function () {
        this.dampForce(this.speed, td);
        this.position.x += this.speed.x * Math.cos(this.direction) * td;
        this.position.y += this.speed.y * Math.sin(this.direction) * td;
        this.position.iadd(this.velocity.muls(td));
    },

    rotateLeft: function () {
        this.direction -= Math.PI / 60;
    },
    rotateRight: function () {
        this.direction += Math.PI / 60;
    },

    throttle: function (td) {
        this.accelerateForce(this.speed, td);
    },
    breaks: function (td) {
        this.breakForce(this.speed, td);
        this.breakForce(this.velocity, td);
    },

    update: function (td, width, height) {
        if (Key.isDown(Key.UP, Key.W)) this.throttle(td);
        if (Key.isDown(Key.LEFT, Key.A)) this.rotateLeft();
        if (Key.isDown(Key.DOWN, Key.S)) this.breaks(td);
        if (Key.isDown(Key.RIGHT, Key.D)) this.rotateRight();
        Forces.update(this.velocity, td);
        this.moveForward(td);
    },

    collideTest: function (ct) {

        // Collision detection. Get a clip from the screen.
        var clipWidth = 1;
        var clipDepth = 1;
        var clipLength = clipWidth * clipDepth;
        var whatColor = ct.getImageData(this.position.x, this.position.y, clipWidth, clipDepth);

        // Loop through the clip and see if you find RGB with value over 10. 
        for (var i = 0; i < clipLength * 4; i += 4) {
            if (whatColor.data[i] > 10 ||
                whatColor.data[i + 1] > 10 ||
                whatColor.data[i + 2] > 10) {
                //console.log('Not black.');
                this.speed.x = this.speed.y = 0;
                break;

            } else if (whatColor.data[i] === 8 &&
                whatColor.data[i + 1] === 0 &&
                whatColor.data[i + 2] === 0) {

                if (this.trackCount.over_checkpoint === false &&
                    this.trackCount.checkpoint_1 === true &&
                    this.trackCount.checkpoint_2 === true) {
                    this.trackCount.lap++;
                    this.trackCount.checkpoint_1 = false;
                    this.trackCount.checkpoint_2 = false;
                    this.trackCount.over_checkpoint = true;
                    console.log(this.trackCount);
                    break;
                }

            } else if (whatColor.data[i] === 0 &&
                whatColor.data[i + 1] === 8 &&
                whatColor.data[i + 2] === 0) {

                if (this.trackCount.over_checkpoint == false) {
                    this.trackCount.checkpoint_1 = true;
                    this.trackCount.over_checkpoint = true;
                    console.log(this.trackCount);
                    break;
                }

            } else if (whatColor.data[i] === 0 &&
                whatColor.data[i + 1] === 0 &&
                whatColor.data[i + 2] === 8) {

                if (this.trackCount.over_checkpoint === false &&
                    this.trackCount.checkpoint_1 === true) {
                    this.trackCount.checkpoint_2 = true;
                    this.trackCount.over_checkpoint = true;
                    console.log(this.trackCount);
                    break;
                }

            } else if (whatColor.data[i] === 0 &&
                whatColor.data[i + 1] === 0 &&
                whatColor.data[i + 2] === 0) {
                this.trackCount.over_checkpoint = false;
            }
        }
    }

}

/**
 * Asteroids, the Game
 */
window.Asteroids = (function () {
    var canvas, ct, ship, lastGameTick;

    var trackCount = {
        lap: 0,
        checkpoint_1: false,
        checkpoint_2: false,
        over_checkpoint: false,
        finish_time: 0,
        stop_the_watch: false
    };

    var stopwatchOffset = Date.now();

    var background = new Image(); // Create new img element
    background.src = 'img/RacingTrack.jpg'; // Set source path

    var init = function (canvas) {
        canvas = document.getElementById(canvas);
        ct = canvas.getContext('2d');
        width = canvas.width;
        height = canvas.height;
        ct.lineWidth = 1;
        ct.strokeStyle = 'hsla(0,0%,100%,1)';
        ship = new Player(trackCount, 15, 25, new Vector(width / 2, 154));

        console.log('Init the game');
    };

    var update = function (td) {
        ship.collideTest(ct);
        ship.update(td, width, height);
    };

    var render = function () {
        ct.clearRect(0, 0, width, height);
        setBackground();
        setInfoDisplay();
        ship.draw(ct);
    };

    var gameLoop = function () {
        var now = Date.now();
        td = (now - (lastGameTick || now)) / 1000; // Timediff since last frame / gametick
        lastGameTick = now;
        requestAnimFrame(gameLoop);
        update(td);
        render();
    };

    var setBackground = function () {
        ct.save();
        ct.drawImage(background, 0, 0);

        ct.beginPath();
        ct.moveTo(350, 133);
        ct.lineTo(350, 176)
        ct.strokeStyle = "#080000";
        ct.lineWidth = 10;
        ct.stroke();

        ct.beginPath();
        ct.moveTo(700, 375);
        ct.lineTo(700, 418)
        ct.strokeStyle = "#000800";
        ct.lineWidth = 10;
        ct.stroke();

        ct.beginPath();
        ct.moveTo(250, 497);
        ct.lineTo(250, 540)
        ct.strokeStyle = "#000008";
        ct.lineWidth = 10;
        ct.stroke();

        ct.restore();
    }

    var setInfoDisplay = function () {

        var stopwatch = Date.now();
        var message = 'Wait';
        var millis = stopwatch - stopwatchOffset;
        var min = (millis / 1000) / 60;
        var sec = (millis / 1000) % 60;

        min = Math.round(min);
        sec = Math.round(sec);
        var tenth = Math.round((millis / 100) % 9);

        ct.save();
        ct.strokeStyle = "#00FF00";
        ct.lineWidth = 10;
        ct.font = "bold 30px Arial";
        ct.strokeText("Mini-Madness", 580, 60);

        ct.fillStyle = "#003300";
        ct.fillText("Mini-Madness", 580, 60);
        ct.restore();

        if (trackCount.lap === 3 && trackCount.stop_the_watch === false) {
            trackCount.finish_time = '' + min + ':' + sec + ':' + tenth;
            trackCount.stop_the_watch = true;
        }

        if (trackCount.stop_the_watch === false) {
            ct.save();

            ct.strokeStyle = "#00FF00";
            ct.lineWidth = 2;
            ct.font = "bold 25px Arial";
            ct.strokeText('Lap: ' + trackCount.lap, 630, 100);
            ct.strokeText('Time: ' + min + ':' + sec + ':' + tenth, 600, 140);

            ct.fillStyle = "#003300";
            ct.fillText('Lap: ' + trackCount.lap, 630, 100);
            ct.fillText('Time: ' + min + ':' + sec + ':' + tenth, 600, 140);

            ct.restore();

        } else {
            ct.save();

            ct.strokeStyle = "#00FF00";
            ct.lineWidth = 2;
            ct.font = "bold 25px Arial";
            ct.strokeText('Lap: 3', 630, 100);
            ct.strokeText('Time: ' + trackCount.finish_time, 600, 140);

            ct.fillStyle = "#FF0000";
            ct.fillText('Lap: 3', 630, 100);
            ct.fillText('Time: ' + trackCount.finish_time, 600, 140);

            ct.restore();
        }
    }

    return {
        'init': init,
        'gameLoop': gameLoop
    }
})();

// On ready
$(function () {
    'use strict';

    $('body').append("<canvas id='canvas1' width='800' height='554'>Your browser does not support the element HTML5 Canvas.</canvas><br><button id='restartButton'>Click to restart game</button>");

    $('#restartButton').click(function () {
        window.location.reload();
    });

    Asteroids.init('canvas1');
    Asteroids.gameLoop();

    console.log('Ready to play.');

});