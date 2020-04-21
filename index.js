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