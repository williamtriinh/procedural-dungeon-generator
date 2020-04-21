(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Delaunator = require("delaunator");

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

// SEPARATING
// AVERAGING
// CONNECTING
let generationState = "SEPARATING";
const cellSize = 5;

let setupCanvas = () =>
{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

let renderMst = true;
let renderGraph = false;
let renderCorridors = true;

let rectangles = [];
let points = [];   // The points for the mst
let nodes = [];
let arr = [];
let mst = [];
let corridors = [];
let corridorsAvg = [];
function Rect (x, y, wInCells, hInCells, id)
{
    this.x = x;
    this.y = y;
    // this.w = w;
    // this.h = h;
    this.wInCells = wInCells;
    this.hInCells = hInCells;
    this.id = id;
    this.vel = {
        x: 0,
        y: 0
    };
    this.draw = () =>
    {
        ctx.fillStyle = "#00000033";
        let rx = this.x; // Math.floor(this.x / cellSize) * cellSize;
        let ry = this.y; // Math.floor(this.y / cellSize) * cellSize;
        ctx.fillRect(rx, ry, this.wInCells * cellSize, this.hInCells * cellSize);

        ctx.fillStyle = "red";
        for (let y = 0; y < this.hInCells; y++)
        {
            ctx.fillRect(rx, ry + cellSize * y, this.wInCells * cellSize, 1);
            for (let x = 0; x < this.wInCells; x++)
            {
                ctx.fillRect(rx + cellSize * x, ry, 1, this.hInCells * cellSize);
            }
        }

        ctx.strokeStyle = "blue";
        ctx.strokeRect(rx, ry, this.wInCells * cellSize, this.hInCells * cellSize);

        // Display ids
        ctx.fillStyle = "lime";
        ctx.font = "bold 14px Arial";
        ctx.fillText(this.id, this.x, this.y + 10);
    }
}

let forEachTriangleEdge = (delaunay) => {
    for (let e = 0; e < delaunay.triangles.length; e++) {
        const p = nodes[delaunay.triangles[e]];
        const q = nodes[delaunay.triangles[(e % 3 === 2) ? e - 2 : e + 1]];
        points.push([p, q, calculateEdgeWeight(p["point"][0], p["point"][1], q["point"][0], q["point"][1])]);
    }
}

let getRandomPointInCircle = () =>
{
    let radius = 18 * cellSize;
    let distanceFromCenter = Math.random() * (radius - 20);
    let angle = Math.random() * 2 * Math.PI;
    return {
        x: Math.floor(canvas.width / 2 + Math.cos(angle) * distanceFromCenter),
        y: Math.floor(canvas.height / 2 + Math.sin(angle) * distanceFromCenter)
    };
}

let separate = () =>
{
    let state = "AVERAGING";
    let speed = 2;
    for (let i = 0; i < rectangles.length; i++) {
        let r = rectangles[i];
        r.vel.x = 0;
        r.vel.y = 0;

        // Flocking separation
        // Check for collision
        for (let k = 0; k < rectangles.length; k++) {
            // Make sure it isn't checking a collision with itself
            if (rectangles[k].id !== r.id) {
                let r2 = rectangles[k];

                // Check collision
                if (r.x < r2.x + r2.wInCells * cellSize &&
                    r.x + r.wInCells * cellSize > r2.x &&
                    r.y < r2.y + r2.hInCells * cellSize &&
                    r.y + r.hInCells * cellSize > r2.y) {
                    state = "SEPARATING";

                    // Calculate the difference in x and y positions
                    let vx = (r2.x + r2.wInCells * cellSize / 2) - (r.x + r.wInCells * cellSize / 2);
                    let vy = (r2.y + r2.hInCells * cellSize / 2) - (r.y + r.hInCells * cellSize / 2);

                    // Calculate the hypotneuse using the c/y components
                    let vh = Math.sqrt(Math.pow(vx, 2) + Math.pow(vy, 2));

                    // Calculate velocity using x and y unit vectors
                    r.vel.x += speed * (vh === 0 ? 0 : vx / vh);
                    r.vel.y += speed * (vh === 0 ? 0 : vy / vh);
                }
            }
        }

        r.vel.x *= -1;
        r.vel.y *= -1;
    }
    return state;
}

let calculateEdgeWeight = (x1, y1, x2, y2) =>
{
    let x = x2 - x1;
    let y = y2 - y1;
    return Math.sqrt( x * x + y * y );
}

let root = (index) => { // The node id (which is also it's position in nodes[])
    while(arr[index] != index) { // While the index to the node is not equal to the node id
        index = arr[index];
    }
    return index; // Return the node id (root)
}

let find = (a, b) => { // index of the nodes
    // Find root of a
    if (root(a) === root(b))
    {
        return true;
    }
    else
    {
        return false;
    }
}

let union = (a, b) => { // Connect the nodes together. Parameters are node ids
    if (find(a, b))
    {
        return false;
    }

    let rootA = root(a);
    let rootB = root(b);
    arr[rootA] = rootB;

    return true;
}

let minimumSpanningTree = () =>
{
    for (let i=0; i<nodes.length; i++)
    {
        arr.push(i);
    }
    
    // Randomly choose a vertex from nodes
    let queue = [];
    for (let i=0; i<points.length; i++)
    {
        queue.push(points[i]);
    }

    // Sort the queue in ascending order of weight.
    queue.sort((a, b) => a[2] - b[2]);

    while (queue.length > 0)
    {
        if (union(queue[0][0].id, queue[0][1].id))
        {
            mst.push(queue.splice(0, 1)[0]);
        } 
        else
        {
            queue.splice(0, 1);
        }
        
    }

}

let average = () =>
{
    let midpoints = [];
    for (let i=0; i<rectangles.length; i++)
    {
        let r = rectangles[i];
        r.id = i;
        midpoints.push([
            Math.floor((r.x + r.wInCells / 2 * cellSize) / cellSize) * cellSize,
            Math.floor((r.y + r.hInCells / 2 * cellSize) / cellSize) * cellSize
        ]);

        nodes.push({
            id: r.id,
            x: r.x,
            y: r.y,
            w: r.wInCells * cellSize,
            h: r.hInCells * cellSize,
            point: [
                Math.floor((r.x + r.wInCells / 2 * cellSize) / cellSize) * cellSize,
                Math.floor((r.y + r.hInCells / 2 * cellSize) / cellSize) * cellSize
            ]
        });
    }

    nodes.sort((a, b) => a.id - b.id);

    let delaunay = Delaunator.from(midpoints);
    vertices = delaunay.triangles;

    forEachTriangleEdge(delaunay); // Find all the half edges for each point (no repeats)

    minimumSpanningTree();
    
    return "CONNECTING";
}

let connect = () => {
    // Create paths from a node to the other node (connected by their edge).
    // Travel along the x and y axis
    
    for (let i=0; i<mst.length; i++)
    {
        let nodeA = mst[i][0];
        let nodeB = mst[i][1];

        // Calculate the average between the two node's positions
        let xAvg = (nodeA.point[0] + nodeB.point[0]) / 2;
        let yAvg = (nodeA.point[1] + nodeB.point[1]) / 2;

        corridorsAvg.push([xAvg, yAvg]);

        // Check if the x/y averages intercept both rooms
        if (nodeA.x <= xAvg && nodeA.x + nodeA.w >= xAvg && nodeB.x <= xAvg && nodeB.x + nodeB.w >= xAvg)
        {
            corridors.push([
                xAvg, // a.x
                nodeA.point[1], // a.y
                xAvg, // b.x
                nodeB.point[1], // b.y
            ]);
            continue;
        }

        if (nodeA.y <= yAvg && nodeA.y + nodeA.h >= yAvg && nodeB.y <= yAvg && nodeB.y + nodeB.h >= yAvg) {
            corridors.push([
                nodeA.point[0], // a.x
                yAvg, // a.y,
                nodeB.point[0], // b.x
                yAvg// b.y
            ]);
            continue;
        }

        // Connect them by forming an "L" shaped corridor
        // x component takes precedence over y (hallways goning along the x axis)
        corridors.push([
            nodeA.point[0], // a.x
            nodeA.point[1], // a.y
            nodeB.point[0], // b.x
            nodeA.point[1] // b.y
        ]);

        corridors.push([
            nodeB.point[0], // a.x
            nodeA.point[1], // a.y
            nodeB.point[0], // b.x
            nodeB.point[1] // b.y
        ]);
    }

    return null;
    
}

let createRectangles = () =>
{
    // Circular region
    let diameter = 300;

    // Create rectangles within a radius
    let amount = 20;
    let min = 8;// 4;
    let max = 18;// 12;
    for (let i=0; i<amount; i++)
    {
        let center = getRandomPointInCircle();
        let cx = center.x;
        let cy = center.y;

        // let w = Math.floor(Math.random() * (120 - 40) + 40);
        // let h = Math.floor(Math.random() * (120 - 40) + 40);
        let wInCells = Math.floor(Math.random() * (max - min) + min);
        let hInCells = Math.floor(Math.random() * (max - min) + min);

        rectangles.push(new Rect(cx - wInCells / 2 * cellSize, cy - hInCells / 2 * cellSize, wInCells, hInCells, i));
    }
}

let gameLoop = () =>
{
    window.requestAnimationFrame(gameLoop);
    for (let i=0; i<rectangles.length; i++)
    {
        let r = rectangles[i];
        r.x += r.vel.x;
        r.y += r.vel.y;
    }
    
    switch(generationState)
    {
        case "SEPARATING":
            generationState = separate();
            break;
        case "AVERAGING":
            generationState = average();
            break;
        case "CONNECTING":
            generationState = connect();
            break;
        default: break;
    }

    render();
}

let render = () =>
{
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw
    for (let i = 0; i < rectangles.length; i++) {
        let r = rectangles[i];
        r.draw();
    }

    ctx.fillStyle = "lime";
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    if (renderGraph)
    {
        for (let i = 0; i < nodes.length; i++) {
            let cx = nodes[i].point[0];
            let cy = nodes[i].point[1];
            ctx.fillRect(cx - 4, cy - 4, 8, 8);
        }

        if (!renderMst)
        {
            for (let i = 0; i < points.length; i++) {
                ctx.beginPath();
                ctx.moveTo(points[i][0]["point"][0], points[i][0]["point"][1]);
                ctx.lineTo(points[i][1]["point"][0], points[i][1]["point"][1]);
                ctx.stroke();
            }
        }
        else
        {
            for (let i = 0; i < mst.length; i++) {
                ctx.beginPath();
                ctx.moveTo(mst[i][0]["point"][0], mst[i][0]["point"][1]);
                ctx.lineTo(mst[i][1]["point"][0], mst[i][1]["point"][1]);
                ctx.stroke();
            }
        }
    }

    ctx.strokeStyle = "pink";
    ctx.lineWidth = 2;
    if (renderCorridors)
    {
        for (let i = 0; i < corridors.length; i++) {
            ctx.beginPath();
            ctx.moveTo(corridors[i][0], corridors[i][1]);
            ctx.lineTo(corridors[i][2], corridors[i][3]);
            ctx.stroke();
        }

        ctx.fillStyle = "pink";
        for (let i = 0; i < corridorsAvg.length; i++) {
            let el = corridorsAvg[i];
            ctx.fillRect(el[0] - 3, el[1] - 3, 6, 6);
        }
    }

    ctx.lineWidth = 1;
}

let main = () =>
{
    setupCanvas();
    createRectangles();

    gameLoop();
    render();
}

window.addEventListener("keypress", ev => {
    switch(ev.key)
    {
        case "t": renderMst = !renderMst; break;
        case "r": renderGraph = !renderGraph; break;
        case "y": renderCorridors = !renderCorridors; break;
    }
});

main();
},{"delaunator":2}],2:[function(require,module,exports){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.Delaunator = factory());
}(this, function () { 'use strict';

    var EPSILON = Math.pow(2, -52);
    var EDGE_STACK = new Uint32Array(512);

    var Delaunator = function Delaunator(coords) {
        var n = coords.length >> 1;
        if (n > 0 && typeof coords[0] !== 'number') { throw new Error('Expected coords to contain numbers.'); }

        this.coords = coords;

        // arrays that will store the triangulation graph
        var maxTriangles = Math.max(2 * n - 5, 0);
        this._triangles = new Uint32Array(maxTriangles * 3);
        this._halfedges = new Int32Array(maxTriangles * 3);

        // temporary arrays for tracking the edges of the advancing convex hull
        this._hashSize = Math.ceil(Math.sqrt(n));
        this._hullPrev = new Uint32Array(n); // edge to prev edge
        this._hullNext = new Uint32Array(n); // edge to next edge
        this._hullTri = new Uint32Array(n); // edge to adjacent triangle
        this._hullHash = new Int32Array(this._hashSize).fill(-1); // angular edge hash

        // temporary arrays for sorting points
        this._ids = new Uint32Array(n);
        this._dists = new Float64Array(n);

        this.update();
    };

    Delaunator.from = function from (points, getX, getY) {
            if ( getX === void 0 ) getX = defaultGetX;
            if ( getY === void 0 ) getY = defaultGetY;

        var n = points.length;
        var coords = new Float64Array(n * 2);

        for (var i = 0; i < n; i++) {
            var p = points[i];
            coords[2 * i] = getX(p);
            coords[2 * i + 1] = getY(p);
        }

        return new Delaunator(coords);
    };

    Delaunator.prototype.update = function update () {
        var ref =  this;
            var coords = ref.coords;
            var hullPrev = ref._hullPrev;
            var hullNext = ref._hullNext;
            var hullTri = ref._hullTri;
            var hullHash = ref._hullHash;
        var n = coords.length >> 1;

        // populate an array of point indices; calculate input data bbox
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;

        for (var i = 0; i < n; i++) {
            var x = coords[2 * i];
            var y = coords[2 * i + 1];
            if (x < minX) { minX = x; }
            if (y < minY) { minY = y; }
            if (x > maxX) { maxX = x; }
            if (y > maxY) { maxY = y; }
            this._ids[i] = i;
        }
        var cx = (minX + maxX) / 2;
        var cy = (minY + maxY) / 2;

        var minDist = Infinity;
        var i0, i1, i2;

        // pick a seed point close to the center
        for (var i$1 = 0; i$1 < n; i$1++) {
            var d = dist(cx, cy, coords[2 * i$1], coords[2 * i$1 + 1]);
            if (d < minDist) {
                i0 = i$1;
                minDist = d;
            }
        }
        var i0x = coords[2 * i0];
        var i0y = coords[2 * i0 + 1];

        minDist = Infinity;

        // find the point closest to the seed
        for (var i$2 = 0; i$2 < n; i$2++) {
            if (i$2 === i0) { continue; }
            var d$1 = dist(i0x, i0y, coords[2 * i$2], coords[2 * i$2 + 1]);
            if (d$1 < minDist && d$1 > 0) {
                i1 = i$2;
                minDist = d$1;
            }
        }
        var i1x = coords[2 * i1];
        var i1y = coords[2 * i1 + 1];

        var minRadius = Infinity;

        // find the third point which forms the smallest circumcircle with the first two
        for (var i$3 = 0; i$3 < n; i$3++) {
            if (i$3 === i0 || i$3 === i1) { continue; }
            var r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i$3], coords[2 * i$3 + 1]);
            if (r < minRadius) {
                i2 = i$3;
                minRadius = r;
            }
        }
        var i2x = coords[2 * i2];
        var i2y = coords[2 * i2 + 1];

        if (minRadius === Infinity) {
            // order collinear points by dx (or dy if all x are identical)
            // and return the list as a hull
            for (var i$4 = 0; i$4 < n; i$4++) {
                this._dists[i$4] = (coords[2 * i$4] - coords[0]) || (coords[2 * i$4 + 1] - coords[1]);
            }
            quicksort(this._ids, this._dists, 0, n - 1);
            var hull = new Uint32Array(n);
            var j = 0;
            for (var i$5 = 0, d0 = -Infinity; i$5 < n; i$5++) {
                var id = this._ids[i$5];
                if (this._dists[id] > d0) {
                    hull[j++] = id;
                    d0 = this._dists[id];
                }
            }
            this.hull = hull.subarray(0, j);
            this.triangles = new Uint32Array(0);
            this.halfedges = new Uint32Array(0);
            return;
        }

        // swap the order of the seed points for counter-clockwise orientation
        if (orient(i0x, i0y, i1x, i1y, i2x, i2y)) {
            var i$6 = i1;
            var x$1 = i1x;
            var y$1 = i1y;
            i1 = i2;
            i1x = i2x;
            i1y = i2y;
            i2 = i$6;
            i2x = x$1;
            i2y = y$1;
        }

        var center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
        this._cx = center.x;
        this._cy = center.y;

        for (var i$7 = 0; i$7 < n; i$7++) {
            this._dists[i$7] = dist(coords[2 * i$7], coords[2 * i$7 + 1], center.x, center.y);
        }

        // sort the points by distance from the seed triangle circumcenter
        quicksort(this._ids, this._dists, 0, n - 1);

        // set up the seed triangle as the starting hull
        this._hullStart = i0;
        var hullSize = 3;

        hullNext[i0] = hullPrev[i2] = i1;
        hullNext[i1] = hullPrev[i0] = i2;
        hullNext[i2] = hullPrev[i1] = i0;

        hullTri[i0] = 0;
        hullTri[i1] = 1;
        hullTri[i2] = 2;

        hullHash.fill(-1);
        hullHash[this._hashKey(i0x, i0y)] = i0;
        hullHash[this._hashKey(i1x, i1y)] = i1;
        hullHash[this._hashKey(i2x, i2y)] = i2;

        this.trianglesLen = 0;
        this._addTriangle(i0, i1, i2, -1, -1, -1);

        for (var k = 0, xp = (void 0), yp = (void 0); k < this._ids.length; k++) {
            var i$8 = this._ids[k];
            var x$2 = coords[2 * i$8];
            var y$2 = coords[2 * i$8 + 1];

            // skip near-duplicate points
            if (k > 0 && Math.abs(x$2 - xp) <= EPSILON && Math.abs(y$2 - yp) <= EPSILON) { continue; }
            xp = x$2;
            yp = y$2;

            // skip seed triangle points
            if (i$8 === i0 || i$8 === i1 || i$8 === i2) { continue; }

            // find a visible edge on the convex hull using edge hash
            var start = 0;
            for (var j$1 = 0, key = this._hashKey(x$2, y$2); j$1 < this._hashSize; j$1++) {
                start = hullHash[(key + j$1) % this._hashSize];
                if (start !== -1 && start !== hullNext[start]) { break; }
            }

            start = hullPrev[start];
            var e = start, q = (void 0);
            while (q = hullNext[e], !orient(x$2, y$2, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1])) {
                e = q;
                if (e === start) {
                    e = -1;
                    break;
                }
            }
            if (e === -1) { continue; } // likely a near-duplicate point; skip it

            // add the first triangle from the point
            var t = this._addTriangle(e, i$8, hullNext[e], -1, -1, hullTri[e]);

            // recursively flip triangles from the point until they satisfy the Delaunay condition
            hullTri[i$8] = this._legalize(t + 2);
            hullTri[e] = t; // keep track of boundary triangles on the hull
            hullSize++;

            // walk forward through the hull, adding more triangles and flipping recursively
            var n$1 = hullNext[e];
            while (q = hullNext[n$1], orient(x$2, y$2, coords[2 * n$1], coords[2 * n$1 + 1], coords[2 * q], coords[2 * q + 1])) {
                t = this._addTriangle(n$1, i$8, q, hullTri[i$8], -1, hullTri[n$1]);
                hullTri[i$8] = this._legalize(t + 2);
                hullNext[n$1] = n$1; // mark as removed
                hullSize--;
                n$1 = q;
            }

            // walk backward from the other side, adding more triangles and flipping
            if (e === start) {
                while (q = hullPrev[e], orient(x$2, y$2, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1])) {
                    t = this._addTriangle(q, i$8, e, -1, hullTri[e], hullTri[q]);
                    this._legalize(t + 2);
                    hullTri[q] = t;
                    hullNext[e] = e; // mark as removed
                    hullSize--;
                    e = q;
                }
            }

            // update the hull indices
            this._hullStart = hullPrev[i$8] = e;
            hullNext[e] = hullPrev[n$1] = i$8;
            hullNext[i$8] = n$1;

            // save the two new edges in the hash table
            hullHash[this._hashKey(x$2, y$2)] = i$8;
            hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
        }

        this.hull = new Uint32Array(hullSize);
        for (var i$9 = 0, e$1 = this._hullStart; i$9 < hullSize; i$9++) {
            this.hull[i$9] = e$1;
            e$1 = hullNext[e$1];
        }

        // trim typed triangle mesh arrays
        this.triangles = this._triangles.subarray(0, this.trianglesLen);
        this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
    };

    Delaunator.prototype._hashKey = function _hashKey (x, y) {
        return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
    };

    Delaunator.prototype._legalize = function _legalize (a) {
        var ref = this;
            var triangles = ref._triangles;
            var halfedges = ref._halfedges;
            var coords = ref.coords;

        var i = 0;
        var ar = 0;

        // recursion eliminated with a fixed-size stack
        while (true) {
            var b = halfedges[a];

            /* if the pair of triangles doesn't satisfy the Delaunay condition
             * (p1 is inside the circumcircle of [p0, pl, pr]), flip them,
             * then do the same check/flip recursively for the new pair of triangles
             *
             *       pl                pl
             *      /||\              /  \
             *   al/ || \bl        al/\a
             *    /  ||  \          /  \
             *   /  a||b  \flip/___ar___\
             * p0\   ||   /p1   =>   p0\---bl---/p1
             *    \  ||  /          \  /
             *   ar\ || /br         b\/br
             *      \||/              \  /
             *       pr                pr
             */
            var a0 = a - a % 3;
            ar = a0 + (a + 2) % 3;

            if (b === -1) { // convex hull edge
                if (i === 0) { break; }
                a = EDGE_STACK[--i];
                continue;
            }

            var b0 = b - b % 3;
            var al = a0 + (a + 1) % 3;
            var bl = b0 + (b + 2) % 3;

            var p0 = triangles[ar];
            var pr = triangles[a];
            var pl = triangles[al];
            var p1 = triangles[bl];

            var illegal = inCircle(
                coords[2 * p0], coords[2 * p0 + 1],
                coords[2 * pr], coords[2 * pr + 1],
                coords[2 * pl], coords[2 * pl + 1],
                coords[2 * p1], coords[2 * p1 + 1]);

            if (illegal) {
                triangles[a] = p1;
                triangles[b] = p0;

                var hbl = halfedges[bl];

                // edge swapped on the other side of the hull (rare); fix the halfedge reference
                if (hbl === -1) {
                    var e = this._hullStart;
                    do {
                        if (this._hullTri[e] === bl) {
                            this._hullTri[e] = a;
                            break;
                        }
                        e = this._hullPrev[e];
                    } while (e !== this._hullStart);
                }
                this._link(a, hbl);
                this._link(b, halfedges[ar]);
                this._link(ar, bl);

                var br = b0 + (b + 1) % 3;

                // don't worry about hitting the cap: it can only happen on extremely degenerate input
                if (i < EDGE_STACK.length) {
                    EDGE_STACK[i++] = br;
                }
            } else {
                if (i === 0) { break; }
                a = EDGE_STACK[--i];
            }
        }

        return ar;
    };

    Delaunator.prototype._link = function _link (a, b) {
        this._halfedges[a] = b;
        if (b !== -1) { this._halfedges[b] = a; }
    };

    // add a new triangle given vertex indices and adjacent half-edge ids
    Delaunator.prototype._addTriangle = function _addTriangle (i0, i1, i2, a, b, c) {
        var t = this.trianglesLen;

        this._triangles[t] = i0;
        this._triangles[t + 1] = i1;
        this._triangles[t + 2] = i2;

        this._link(t, a);
        this._link(t + 1, b);
        this._link(t + 2, c);

        this.trianglesLen += 3;

        return t;
    };

    // monotonically increases with real angle, but doesn't need expensive trigonometry
    function pseudoAngle(dx, dy) {
        var p = dx / (Math.abs(dx) + Math.abs(dy));
        return (dy > 0 ? 3 - p : 1 + p) / 4; // [0..1]
    }

    function dist(ax, ay, bx, by) {
        var dx = ax - bx;
        var dy = ay - by;
        return dx * dx + dy * dy;
    }

    // return 2d orientation sign if we're confident in it through J. Shewchuk's error bound check
    function orientIfSure(px, py, rx, ry, qx, qy) {
        var l = (ry - py) * (qx - px);
        var r = (rx - px) * (qy - py);
        return Math.abs(l - r) >= 3.3306690738754716e-16 * Math.abs(l + r) ? l - r : 0;
    }

    // a more robust orientation test that's stable in a given triangle (to fix robustness issues)
    function orient(rx, ry, qx, qy, px, py) {
        var sign = orientIfSure(px, py, rx, ry, qx, qy) ||
        orientIfSure(rx, ry, qx, qy, px, py) ||
        orientIfSure(qx, qy, px, py, rx, ry);
        return sign < 0;
    }

    function inCircle(ax, ay, bx, by, cx, cy, px, py) {
        var dx = ax - px;
        var dy = ay - py;
        var ex = bx - px;
        var ey = by - py;
        var fx = cx - px;
        var fy = cy - py;

        var ap = dx * dx + dy * dy;
        var bp = ex * ex + ey * ey;
        var cp = fx * fx + fy * fy;

        return dx * (ey * cp - bp * fy) -
               dy * (ex * cp - bp * fx) +
               ap * (ex * fy - ey * fx) < 0;
    }

    function circumradius(ax, ay, bx, by, cx, cy) {
        var dx = bx - ax;
        var dy = by - ay;
        var ex = cx - ax;
        var ey = cy - ay;

        var bl = dx * dx + dy * dy;
        var cl = ex * ex + ey * ey;
        var d = 0.5 / (dx * ey - dy * ex);

        var x = (ey * bl - dy * cl) * d;
        var y = (dx * cl - ex * bl) * d;

        return x * x + y * y;
    }

    function circumcenter(ax, ay, bx, by, cx, cy) {
        var dx = bx - ax;
        var dy = by - ay;
        var ex = cx - ax;
        var ey = cy - ay;

        var bl = dx * dx + dy * dy;
        var cl = ex * ex + ey * ey;
        var d = 0.5 / (dx * ey - dy * ex);

        var x = ax + (ey * bl - dy * cl) * d;
        var y = ay + (dx * cl - ex * bl) * d;

        return {x: x, y: y};
    }

    function quicksort(ids, dists, left, right) {
        if (right - left <= 20) {
            for (var i = left + 1; i <= right; i++) {
                var temp = ids[i];
                var tempDist = dists[temp];
                var j = i - 1;
                while (j >= left && dists[ids[j]] > tempDist) { ids[j + 1] = ids[j--]; }
                ids[j + 1] = temp;
            }
        } else {
            var median = (left + right) >> 1;
            var i$1 = left + 1;
            var j$1 = right;
            swap(ids, median, i$1);
            if (dists[ids[left]] > dists[ids[right]]) { swap(ids, left, right); }
            if (dists[ids[i$1]] > dists[ids[right]]) { swap(ids, i$1, right); }
            if (dists[ids[left]] > dists[ids[i$1]]) { swap(ids, left, i$1); }

            var temp$1 = ids[i$1];
            var tempDist$1 = dists[temp$1];
            while (true) {
                do { i$1++; } while (dists[ids[i$1]] < tempDist$1);
                do { j$1--; } while (dists[ids[j$1]] > tempDist$1);
                if (j$1 < i$1) { break; }
                swap(ids, i$1, j$1);
            }
            ids[left + 1] = ids[j$1];
            ids[j$1] = temp$1;

            if (right - i$1 + 1 >= j$1 - left) {
                quicksort(ids, dists, i$1, right);
                quicksort(ids, dists, left, j$1 - 1);
            } else {
                quicksort(ids, dists, left, j$1 - 1);
                quicksort(ids, dists, i$1, right);
            }
        }
    }

    function swap(arr, i, j) {
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }

    function defaultGetX(p) {
        return p[0];
    }
    function defaultGetY(p) {
        return p[1];
    }

    return Delaunator;

}));

},{}]},{},[1]);