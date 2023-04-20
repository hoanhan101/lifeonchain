/**
 * @title LifeOnchain is an onchain and interactive implementation of Conway's Game of Life
 * @author hoanh.eth
 */
const SPEED = [
    { name: "blistering", value: 10 },
    { name: "rapid", value: 30 },
    { name: "swift", value: 50 },
    { name: "moderate", value: 60 },
    { name: "leisurely", value: 80 },
    { name: "sluggish", value: 100 },
];

const COLORS = [
    { name: "rainbow", value: [] },
    { name: "hacker green", value: ["#000000", "#4dff4d"] },
    { name: "matrix green", value: ["#00ff00", "#0f701e"] },
    { name: "acid burn", value: ["#00ffff", "#04af6d"] },
    { name: "cyberpunk", value: ["#00ff00", "#ff00ff"] },
    { name: "terminator red", value: ["#c0c0c0", "#ff2400"] },
    { name: "hacker black", value: ["#1c1c1c", "#000000"] },
    { name: "circuit board", value: ["#00ff7f", "#7f00ff"] },
    { name: "cyber yellow", value: ["#000000", "#f9dc24"] },
    { name: "neon pink", value: ["#00ff00", "#ff0090"] },
    { name: "hackerman blue", value: ["#ffffff", "#1e90ff"] },
    { name: "lime green", value: ["#000000", "#00ff7f"] },
    { name: "cyber purple", value: ["#00ffff", "#8a2be2"] },
    { name: "ghost in the shell", value: ["#1c1c1c", "#ff6a00"] },
    { name: "cylon red", value: ["#00ff00", "#c21e56"] },
    { name: "darknet red", value: ["#00ff00", "#a62b2b"] },
];

const MODES = [
    { name: "yinyang", value: [] },
    { name: "floating diamond", value: [5, 1, 3, 7] },
    { name: "techno scripspy", value: [1, 6, 4, 8] },
    { name: "glitzy globs", value: [0, 7, 5, 8] },
    { name: "rocketry", value: [0, 0, 2, 2] },
    { name: "flicker box", value: [8, 8, 1, 1] },
    { name: "lazer disk", value: [7, 8, 2, 5] },
    { name: "shattered glass", value: [2, 6, 0, 2] },
    { name: "mayan bricks", value: [2, 4, 1, 2] },
    { name: "honey comb", value: [0, 7, 4, 6] },
    { name: "original", value: [2, 3, 3, 3] },
];

let started = false;
function start() {
    if (started) return;
    started = true;

    let pixelSize = 8;

    let container = document.body;
    let containerWidth = window.innerWidth;
    let containerHeight = window.innerHeight;
    let cols = containerWidth / pixelSize;
    let rows = containerHeight / pixelSize;
    container.style.height = containerHeight + "px";
    container.style.width = containerWidth + "px";

    let seed = cyrb128(tokenID.toString());
    let randSim = mulberry32(seed[0]);

    let sim = new ConwaySimulator(
        rows,
        cols,
        pixelSize,
        SPEED[speedIndex].value,
        randSim
    );
    container.prepend(sim.canvas);

    if (colorIndex === 0) {
        sim.setRainbowScheme();
    } else {
        sim.setPixelColors(...COLORS[colorIndex].value);
    }

    if (modeIndex === 0) {
        sim.setYinYangMode();
    } else {
        sim.setRules(...MODES[modeIndex].value);
    }
    sim.start();
}

// Try thedude's workaround for OpenSea strange reloading issue
function tryToStart() {
    if (
        window.innerWidth == 0 ||
        window.innerHeight == 0 ||
        document.body == null
    ) {
        setTimeout(() => {
            tryToStart();
        }, 1);
    } else {
        start();
    }
}

// Conway's Game of Life implementation
// https://github.com/Tebs-Lab/conways-game-of-life
class ConwaySimulator {
    constructor(rows, cols, pixelSize, interRoundDelay, rand) {
        this.rows = rows;
        this.cols = cols;
        this.pixelSize = pixelSize;
        this.interRoundDelay = interRoundDelay;
        this.mouseIsDown = false;
        this.paused = false;
        this.intervalId = null;

        this.grid = [];
        for (let i = 0; i < rows; i++) {
            this.grid.push([]);
            for (let j = 0; j < cols; j++) {
                let alive = rand() < 0.12;
                this.grid[i].push(new ConwayPixel(alive));
            }
        }

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j].neighbors = this.getNeighbors(i, j);
            }
        }

        let width = this.pixelSize * this.cols;
        let height = this.pixelSize * this.rows;
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvasCtx = this.canvas.getContext("2d", {
            alpha: false,
        });

        this.registerMouseListeners();
    }

    start() {
        if (this.intervalId) {
            return;
        }

        this.intervalId = setInterval(() => {
            this.advanceRound();
            this.repaint();
        }, this.interRoundDelay);
    }

    getNeighbors(row, col) {
        let neighbors = [];
        for (let i = row - 1; i <= row + 1; i++) {
            for (let j = col - 1; j <= col + 1; j++) {
                if (i === row && j === col) continue;
                if (this.grid[i] && this.grid[i][j]) {
                    neighbors.push(this.grid[i][j]);
                }
            }
        }

        return neighbors;
    }

    advanceRound() {
        if (this.mouseIsDown) return;

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j].prepareUpdate();
            }
        }

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j].update();
            }
        }
    }

    repaint(force = false) {
        if (this.mouseIsDown && !force) return;

        let byColor = {};
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let pixel = this.grid[i][j];

                if (
                    !force &&
                    !pixel.forceRepaint &&
                    pixel.alive === pixel.previousState
                ) {
                    continue;
                }

                let color = pixel.alive ? pixel.lifeStyle : pixel.deathStyle;
                if (byColor[color] === undefined) {
                    byColor[color] = [];
                }

                byColor[color].push([i, j]);
                pixel.forceRepaint = false;
            }
        }

        for (let color in byColor) {
            this.canvasCtx.fillStyle = color;
            for (let [row, col] of byColor[color]) {
                this.canvasCtx.fillRect(
                    col * this.pixelSize,
                    row * this.pixelSize,
                    this.pixelSize,
                    this.pixelSize
                );
            }
        }
    }

    paintPixel(row, col) {
        this.grid[row][col].setPaintStyles(this.canvasCtx);
        this.canvasCtx.fillRect(
            col * this.pixelSize,
            row * this.pixelSize,
            this.pixelSize,
            this.pixelSize
        );
    }

    setPixelColors(lifeStyle, deathStyle) {
        this.grid.forEach((row) => {
            row.forEach((entity) => {
                entity.lifeStyle = lifeStyle;
                entity.deathStyle = deathStyle;
                entity.forceRepaint = true;
            });
        });
    }

    setRainbowScheme() {
        let rows = this.grid.length;
        let cols = this.grid[0].length;
        let diagonalLength = Math.sqrt(
            this.rows * this.rows + this.cols * this.cols
        );
        let hueIncrement = 360 / diagonalLength;

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let h = Math.floor(Math.sqrt(i * i + j * j) * hueIncrement);
                let px = this.grid[i][j];
                px.lifeStyle = `hsl(${h}, 100%, 60%)`;
                px.deathStyle = `#000000`;
                px.forceRepaint = true;
            }
        }
    }

    setRules(
        underpopulation,
        overpopulation,
        reproductionMin,
        reproductionMax
    ) {
        this.grid.forEach((row) => {
            row.forEach((pixel) => {
                pixel.underpopulation = underpopulation;
                pixel.overpopulation = overpopulation;
                pixel.reproductionMin = reproductionMin;
                pixel.reproductionMax = reproductionMax;
            });
        });
    }

    setYinYangMode() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols / 2; j++) {
                let t = this.grid[i][j].lifeStyle;
                this.grid[i][j].lifeStyle = this.grid[i][j].deathStyle;
                this.grid[i][j].deathStyle = t;
            }
        }

        this.repaint(true);
    }

    registerMouseListeners() {
        bindMultipleEventListener(
            this.canvas,
            ["mousemove", "touchmove"],
            (e) => {
                e.preventDefault();
                if (this.mouseIsDown) {
                    let x, y;
                    if (e.touches) {
                        let rect = e.target.getBoundingClientRect();
                        x = Math.floor(
                            (e.touches[0].pageX - rect.left) / this.pixelSize
                        );
                        y = Math.floor(
                            (e.touches[0].pageY - rect.top) / this.pixelSize
                        );
                    } else {
                        x = Math.floor(e.offsetX / this.pixelSize);
                        y = Math.floor(e.offsetY / this.pixelSize);
                    }

                    this.grid[y][x].handleClick();
                    this.paintPixel(y, x);
                }
            }
        );

        bindMultipleEventListener(
            this.canvas,
            ["mousedown", "touchstart"],
            (e) => {
                e.preventDefault();
                let rect = e.target.getBoundingClientRect();
                let x, y;
                if (e.touches) {
                    let rect = e.target.getBoundingClientRect();
                    x = Math.floor(
                        (e.touches[0].pageX - rect.left) / this.pixelSize
                    );
                    y = Math.floor(
                        (e.touches[0].pageY - rect.top) / this.pixelSize
                    );
                } else {
                    x = Math.floor(e.offsetX / this.pixelSize);
                    y = Math.floor(e.offsetY / this.pixelSize);
                }

                this.grid[y][x].handleClick();
                this.paintPixel(y, x);
                this.mouseIsDown = true;
            }
        );

        bindMultipleEventListener(this.canvas, ["mouseup", "touchend"], (e) => {
            e.preventDefault();
            this.mouseIsDown = false;
        });
    }
}

class ConwayPixel {
    constructor(alive) {
        this.alive = alive;
        this.lifeStyle = "#39ff14";
        this.deathStyle = "#000000";
        this.underpopulation = 2;
        this.overpopulation = 3;
        this.reproductionMin = 3;
        this.reproductionMax = 3;

        this.neighbors = [];
        this.nextState = null;
        this.previousState = null;
        this.forceRepaint = true;

        if (this.reproductionMax < this.reproductionMin) {
            this.reproductionMin = this.reproductionMax;
        }
    }

    prepareUpdate() {
        let sum = 0;
        let nextState = this.alive;

        for (let n of this.neighbors) {
            if (n.alive && n !== this) sum++;
        }

        if (nextState && sum < this.underpopulation) {
            nextState = false;
        } else if (nextState && sum > this.overpopulation) {
            nextState = false;
        } else if (
            !nextState &&
            sum >= this.reproductionMin &&
            sum <= this.reproductionMax
        ) {
            nextState = true;
        }

        this.nextState = nextState;
    }

    update() {
        this.previousState = this.alive;
        this.alive = this.nextState;
        this.nextState = null;
    }

    handleClick() {
        this.alive = true;
    }

    setPaintStyles(canvasCtx) {
        canvasCtx.fillStyle = this.alive ? this.lifeStyle : this.deathStyle;
    }
}

function bindMultipleEventListener(element, eventNames, f) {
    eventNames.forEach((eventName) => {
        element.addEventListener(eventName, f);
    });
}

// Seed the random generator
// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function cyrb128(str) {
    let h1 = 1779033703,
        h2 = 3144134277,
        h3 = 1013904242,
        h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [
        (h1 ^ h2 ^ h3 ^ h4) >>> 0,
        (h2 ^ h1) >>> 0,
        (h3 ^ h1) >>> 0,
        (h4 ^ h1) >>> 0,
    ];
}

function mulberry32(a) {
    return function () {
        var t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

tryToStart();
window.addEventListener("DOMContentLoaded", () => {
    tryToStart();
});
