import Board from "./Board.js";
import Move from "./Move.js";
import MoveData from "./MoveData.js";
import Piece from "./Piece.js";
import PieceData from "./PieceData.js";
import Position from "./Position.js";
 
let maxDepth = 1;
/** @type {Move[]} */
let currentlyHighlighted = {x: 0, y: 0};
const boardChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890<>";

const POSESSION_ADVANTAGE = 0;
 
let board = new Board();
board.redTurn = confirm("Would you like to go first?");
if (!board.redTurn) {
    board.reset(true);
    setTimeout(_ => recurSort(maxDepth), 100);
}
let [loc, code] = document.location.toString().split('?');

if (code)
    importFromString(code);

async function importFromString(string) {
    let num = 0;
    let color = true;
    for (let i = 0; i < Board.SIZE; i++) {
        for (let j = 0; j < Board.SIZE; j++) {
            let piece = board[i][j];
            piece.type = PieceData.EMPTY;
            piece.isRed = false;
            piece.hasBall = false;
        }
    } 
    for (let posChar of string) {
        let i = boardChars.indexOf(posChar);
        let y = i >> 3;
        let x = i % 8;
        if (num == 0) {
            board[x][y].hasBall = true;
        }
        else {
            board[x][y].type = num;
            board[x][y].isRed = color;
        }
        num++;
        if (num == 6) {
            num = 1;
            if (color)
                break;
            color = false;
        }
    }
    let list = string.split("+");
    let t = list.shift();
    let turn = t[t.length-1];
    board.redTurn = turn != 'r';
    list = list.map(a=> {
        if (a == "-")
            return null;
        return Move.unURIfy(a, board);
    });
    for (let mov of list) {
        if (!mov)
            continue;
        mov.make();
    }
    console.log(board.moveList);
    await recurSort(maxDepth, 1, false);
    await recurSort(maxDepth, 1, false);
    console.log("HERE");
}

function convertToString() {
    let out = "";
    let pieces = [];
    for (let x = 0; x < Board.SIZE; x++) {
        for (let y = 0; y < Board.SIZE; y++) {
            let cell = board[x][y];
            if (cell.isEmpty() && !cell.hasBall)
                continue;
            if (cell.hasBall)
                pieces.unshift(cell);
            if (!cell.isEmpty())
                pieces.push(cell);
        }
    }
    let foundBall = false;
    pieces = pieces.map(a=>{
        return {
            a,
            value: (a.hasBall && !foundBall && (foundBall = true)) * 100 + (a.isRed) * 10 - a.type
        }
    }).sort((a, b) => b.value - a.value).map(a=>a.a);

    for (let piece of pieces) {
        out += boardChars[piece.x*8 + piece.y];
    }
    out = code.split("+")[0];
    out = out.substring(0, out.length-1);
    out += board.isRed ? 'b' : 'r';
    out += "+";
    out += board.moveList[0] ? board.moveList[0].URIfy() : "-";
    out += "+";
    out += board.moveList[1] ? board.moveList[1].URIfy() : "-";
    return out;
}

/**
 * @param {number} depth
 * @param {number} inDep
 * @param {boolean} isMax
 * @param {number} alpha
 * @param {number} beta
 * @returns {{value: number, move: Move, trail: string}}
 */
function minMax(depth, inDep = 0, alpha = -Infinity, beta = Infinity) {
    let pos = evaluate(inDep);
    if (depth <= 0 || pos.isTerminal)
        return pos;

    const tte = board.getPosition();
    if (tte && (tte.depth >= depth)) {
        if (tte.flag == "EXACT") {
            return tte;
        } else if (tte.flag == "LOWERBOUND") {
            alpha = Math.max(alpha, tte.value);
        } else if (tte.flag == "UPPERBOUND") {
            beta = Math.min(beta, tte.value);
        }
        if (alpha >= beta) {
            return tte;
        }
    }
    
    let bestMove = new Position(board.redTurn ? -Infinity : Infinity);
    let final;
    let possibleMoves = generatePossibleMoves(board.redTurn);
    if (possibleMoves.length == 0)
        throw "NO MOVES";
    for (let move of possibleMoves) {
        move.make();
        let extensions = 1;

        // Add quiescence search
        if (depth <= 1) {
            final = new Position(quiescenceSearch(alpha, beta, depth - 1, inDep + 1));
        } else {
            final = minMax(depth - extensions, inDep + 1, alpha, beta);
        }
        
        final.move = move;
        move.undo();

        if (board.redTurn) {
            if (final.value > bestMove.value) {
                bestMove = final;
                bestMove.move = move;
            }
            alpha = Math.max(alpha, bestMove.value);
        } else {
            if (final.value < bestMove.value) {
                bestMove = final;
                bestMove.move = move;
            }
            beta = Math.min(beta, bestMove.value);
        }
        if (beta <= alpha)
            break;
    }
    let bound = "EXACT";
    if (bestMove.value <= alpha) {
        bound = "UPPERBOUND"
    } else if (bestMove.value >= beta) {
        bound = "LOWERBOUND"
    }

    board.storePosition({
        depth: depth,
        flag: bound,
        value: bestMove.value,
        isTerminal: bestMove.isTerminal
    });
    if (bestMove.value == -Infinity || bestMove.value == Infinity)
        throw "Falling Eval Error, depth: " + depth;
    return bestMove;
}

function quiescenceSearch(alpha, beta, depth, inDep) {
    // Evaluate the current position
    let standPat = evaluate(inDep);
    
    // Check if the standPat score is enough to trigger a cutoff
    if (depth <= 0 || standPat.value >= beta || standPat.isTerminal) {
        return standPat.value;
    }

    // const BIG_DELTA = POSESSION_ADVANTAGE;
    // if (standPat.value < alpha - BIG_DELTA) {
    //     return alpha;
    // }
    // If the standPat score is better than alpha, update alpha
    if (standPat.value > alpha) {
        alpha = standPat.value;
    }
    
    // Generate captures and other tactical moves
    let captures = generatePossibleMoves(board.redTurn, 700);
    
    // Iterate over each capture move
    for (let capture of captures) {
        let br = board.redTurn;
        capture.make();
        let change = (board.redTurn != br);
        
        // Recur deeper into the search with reduced depth
        let score;
        if (change)
            score = -quiescenceSearch(-beta, -alpha, depth - 1, inDep + 1);
        else
            score = quiescenceSearch(alpha, beta, depth - 1, inDep + 1);

        capture.undo();
        // Update alpha if a better move is found
        if (score >= beta) {
            return beta; // Beta cutoff
        }
        if (score > alpha) {
            alpha = score;
        }
    }
    
    return alpha;
}
 
function endGameCheck() {
    if (!board.didScoreBlack && !board.didScoreRed)
        return false;
 
    if (board.didScoreBlack) {
        alert("Black wins!");
    }
    else if (board.didScoreRed) {
        alert("Red wins!");
        setTimeout(setTimeout, 0, computerMove, 500); // starts timer when can run
    }
    if (confirm("Play again?")) {
        board.reset(board.didScoreRed);
        drawToScreen();
        return true;
    }
    return false;
}
 
async function computerMove() {
    return await recurSort(maxDepth);
}
 
function showHighlight(x, y) {
    if (currentlyHighlighted.x == x && currentlyHighlighted.y == y)
        toggle();
    else if (modeIndex == 1)
        modeIndex = 0;
    currentlyHighlighted = {x, y};
    let movs = generatePossibleMoves(board.redTurn);
    console.log(movs);
    let myMovs = [];
    for (let i of movs) {
        if (i.isRed == !board.redTurn) // Should check whether or not this is me
            continue;
        switch (i.moveType) {
            case MoveData.MOVE:
                if (i.fx == x && i.fy == y && modeIndex == 0)
                    myMovs.push(i);
            break;
            case MoveData.SWAP:
                if (i.fx == x && i.fy == y && modeIndex == 0)
                    myMovs.push(i);
            break;
            case MoveData.STEAL:
                if (i.tx == x && i.ty == y && modeIndex == 1)
                    myMovs.push(i);
            break;
            case MoveData.KICK:
            case MoveData.GOAL:
                if (i.fx == x && i.fy == y && modeIndex == 1)
                    myMovs.push(i);
            break;
        }
    }
    drawToScreen();
    for (let i of myMovs) {
        let high;
        let square;
        if (i.moveType == MoveData.MOVE) {
            square = document.getElementById(i.tx + "," + i.ty);
            high = document.getElementById(i.tx + "," + i.ty + "c");
            high.classList.remove("piece");
            high.style.opacity = 1;
            high.classList.add("move");
            square.appendChild(high);
        }
        else if (i.moveType == MoveData.STEAL) {
            high = document.getElementById(i.fx + "," + i.fy + "c");
            high.style.boxShadow = "0px 0px 5px 5px red";
        }
        else if (i.moveType == MoveData.KICK || i.moveType == MoveData.GOAL) {
            if (i.toSquare.isEmpty()) {
                square = document.getElementById(i.tx + "," + i.ty);
                high = document.getElementById(i.tx + "," + i.ty + "c");
                high.classList.remove("piece");
                high.style.opacity = 1;
                high.classList.add("move");
                high.style.backgroundColor = "blue";
                high.style.boxShadow = "0px 0px 5px 3px blue";
                if ((i.tx == 0 || i.tx == 7) && (i.ty == 3 || i.ty == 4)) {
                    high.style.backgroundColor = "green";
                    high.style.boxShadow = "0px 0px 5px 3px green";
                }
                square.appendChild(high);
            }
            else {
                high = document.getElementById(i.tx + "," + i.ty + "c");
                high.style.boxShadow = "0px 0px 5px 5px blue";
            }
        }
        else if (i.moveType == MoveData.SWAP) {
            high = document.getElementById(i.tx + "," + i.ty + "c");
            high.style.boxShadow = "0px 0px 5px 5px teal";
        }
        high.style.display = "flex";
 
        high.onclick=()=> {
            i.make();
            console.log(board.zobrist());
            if (endGameCheck())
                return;
            if (!board.secondTurn) {
                setTimeout(computerMove, 100)
            }
            drawToScreen();
        }
    }
 
}
 
function updateEval(evalu = evaluate()) {
    evalu /= 200;
    evalu += 0.5;
    evalu = Math.min(evalu, 1);
    document.getElementById("red").style.width = `calc(var(--full-width) * ${evalu})`;
}

function goalRay(x, y, cx, cy) {
    let dx = x,
        dy = y,
        dist = 0;
    do {
        dist++;
        dx += cx;
        dy += cy;
        if (dx < 0 || dx >= Board.WIDTH || dy < 0 || dy >= Board.HEIGHT)
            return 0;
        if (!board[dx][dy].isEmpty())
            return board[dx][dy].isRed ? 1 : -1;
    }
    while (true);
}

function goalRaysFrom(x, y) {
    return goalRay(x, y, -1, -1) +
            goalRay(x, y, 0, -1) +
            goalRay(x, y, 1, -1) +
            goalRay(x, y, -1, 0) +
            goalRay(x, y, 1, 0) +
            goalRay(x, y, -1, 1) +
            goalRay(x, y, 0, 1) +
            goalRay(x, y, 1, 1);
}

function goalRays() {
    return goalRaysFrom(0, 3) +
           goalRaysFrom(0, 4) +
           goalRaysFrom(7, 3) +
           goalRaysFrom(7, 4);
}

function evaluate(inDep = 1) {
    if (board.didScoreRed)
        return new Position(1000 / inDep, null, true);
    else if (board.didScoreBlack)
        return new Position(-1000 / inDep, null, true);
    let red = 0;
    let black = 0;
    let redPos = false;
    let blackPos = false;
    let redPieces = [];
    let blackPieces = [];
    for (let x = 0; x < Board.WIDTH; x++) {
        for (let y = 0; y < Board.HEIGHT; y++) {
            let piece = board[x][y];
            if (piece.hasBall) {
                if (!piece.isEmpty()) {
                    if (piece.isRed) {
                        red += (8 - x) * (1 + (piece.hasBall - -(piece.type == PieceData.TWO)));
                        redPos = true;
                        red += POSESSION_ADVANTAGE;
                    }
                    else {
                        black += x * (1 + (piece.hasBall - -(piece.type == PieceData.TWO)));
                        blackPos = true;
                        black += POSESSION_ADVANTAGE;
                    }
                }
            }
            if (piece.isEmpty())
                continue;
            if (piece.isRed)
                redPieces.push({x, y});
            else
                blackPieces.push({x, y});
        }
    }

    let dist = 0;
    for (let rp of redPieces) {
        let closDis = 1000;
        for (let bp of blackPieces) {
            let tdis = Math.max(Math.abs(rp.x - bp.x), Math.abs(rp.y - bp.y));
            if (tdis > closDis)
                closDis = tdis;
            dist += tdis ** 2 / 6;
        }
        dist += closDis ** 2;
    }

    if (redPos)
        red += dist / 5000000;
    else if (blackPos)
        black += dist / 5000000;

    let gr = goalRays();
    if (gr > 0)
        red += gr;
    else
        black += -gr;
    return new Position(red - black - Math.random() / 100);
}
 
 
function drawToScreen() {
    let brd = document.getElementById("board");
    if (!brd)
        return setTimeout(drawToScreen, 0);
    brd.innerHTML = "";
    for (let i = 0; i < Board.WIDTH; i++)
        for (let j = 0; j < Board.HEIGHT; j++) {
            let s = document.createElement("div");
            s.id = i+","+j;
            s.classList.add("square")
            s.style.backgroundColor = (i&1) ^ (j&1) ? "#136d15" : "#41980a";
            brd.appendChild(s);
            let piece = board[i][j];

            let c = document.createElement("div");
            c.id = i+","+j+"c";
            c.style.display = "flex";
            if (piece.isEmpty() && !piece.hasBall)
                c.style.display = "none"
            if (board[i][j].hasBall) {
                c.style.backgroundColor = "white";
                c.style.boxShadow = "0px 0px 5px 5px white";
            }
            if (currentlyHighlighted && currentlyHighlighted.x == i && currentlyHighlighted.y == j) {
                if (board[i][j].hasBall)
                    c.style.boxShadow = "0px 0px 5px 5px yellow";
                else
                    c.style.boxShadow = "0px 0px 5px 5px orange";
            }
            c.classList.add("piece");
            if (!piece.isEmpty())
                c.style.backgroundColor = board[i][j].isRed ? "red" : "gray";
            c.onclick = () => showHighlight(i, j);
            s.oncontextmenu = e => {
                e.preventDefault();
                console.log(piece);
                let prp = prompt("");
                if (!prp) {
                    piece.type = -1;
                    piece.isRed = 0;
                    piece.hasBall = 0;
                    return drawToScreen();
                }
                let [t, r, b] = prp;
                piece.type = t-0;
                piece.isRed = r-0;
                piece.hasBall = b-0;
                drawToScreen();
            }
            c.innerText = piece.stringify()[0];
            s.appendChild(c);
        }
}

function tryAddMove(x, y, cx, cy, posMovs, canMove) {
    let dx = x + cx,
        dy = y + cy;
    if (dx < 0 || dx >= Board.WIDTH || dy < 0 || dy >= Board.HEIGHT)
        return;
    let piece = board[dx][dy];
    if ((dx == 7 || dx == 0) && (dy == 3 || dy == 4))
        return;
    
    if (!piece.isEmpty()) {
        if (piece.hasBall) {
            if (board[x][y].type == PieceData.FOUR || 
                board[x][y].type == PieceData.FIVE ||
                board.canSteal(piece, board[x][y]))
                posMovs.unshift(new Move(dx, dy, x, y, MoveData.STEAL, board));
        }
        if (board.canSwap(piece, board[x][y]))
            posMovs.unshift(new Move(x, y, dx, dy, MoveData.SWAP, board));
        return;
    }
    if (canMove)
        posMovs.unshift(new Move(x, y, dx, dy, MoveData.MOVE, board));
}
 
function tryAddShot(x, y, cx, cy, posMovs, repeat = true) {
    let dx = x,
        dy = y,
        hasGoneOver = 0;
    do {
        dx += cx;
        dy += cy;
        if (dx < 0 || dx >= Board.WIDTH || dy < 0 || dy >= Board.HEIGHT)
            return;
        if ((dx == 7 || dx == 0) && (dy == 3 || dy == 4))
            return hasGoneOver ? null : posMovs.unshift(new Move(x, y, dx, dy, MoveData.GOAL, board));
        if (!board[dx][dy].isEmpty()) {
            posMovs.unshift(new Move(x, y, dx, dy, MoveData.KICK, board));
            if (board[x][y].type == PieceData.ONE && hasGoneOver == 0)
                hasGoneOver++;
            else
                return;
        }
        posMovs.push(new Move(x, y, dx, dy, MoveData.KICK,board));
    }
    while (repeat);
}
 
/** @type {(sensor: number) => Move[]} */
function generatePossibleMoves(isMax, lowBound = -Infinity) {
    let posMovs = [];
    let lastMove = board.moveList[board.moveList.length - 1];
    let canMove;
    for (let x = 0; x < Board.WIDTH; x++) {
        for (let y = 0; y < Board.HEIGHT; y++) {
            let piece = board[x][y];
            if (piece.isEmpty())
                continue;
            if ((isMax && !piece.isRed) || (!isMax && piece.isRed))
                continue;
            canMove = (!lastMove || lastMove.moveType != MoveData.MOVE || 
                lastMove.toSquare.type != piece.type || 
                piece.type == PieceData.THREE || piece.isRed != lastMove.toSquare.isRed);
            tryAddMove(x, y, -1, -1, posMovs, canMove);
            tryAddMove(x, y, 0, -1, posMovs, canMove);
            tryAddMove(x, y, 1, -1, posMovs, canMove);
            tryAddMove(x, y, -1, 0, posMovs, canMove);
            tryAddMove(x, y, 1, 0, posMovs, canMove);
            tryAddMove(x, y, -1, 1, posMovs, canMove);
            tryAddMove(x, y, 0, 1, posMovs, canMove);
            tryAddMove(x, y, 1, 1, posMovs, canMove);
            if (!piece.hasBall)
                continue;
            tryAddShot(x, y, -1, -1, posMovs);
            tryAddShot(x, y, 0, -1, posMovs);
            tryAddShot(x, y, 1, -1, posMovs);
            tryAddShot(x, y, -1, 0, posMovs);
            tryAddShot(x, y, 1, 0, posMovs);
            tryAddShot(x, y, -1, 1, posMovs);
            tryAddShot(x, y, 0, 1, posMovs);
            tryAddShot(x, y, 1, 1, posMovs);
            if (piece.type == PieceData.TWO) {
                tryAddShot(x, y, -1, 2, posMovs, false);
                tryAddShot(x, y, 1, 2, posMovs, false);
                tryAddShot(x, y, -1, -2, posMovs, false);
                tryAddShot(x, y, 1, -2, posMovs, false);
                tryAddShot(x, y, -2, 1, posMovs, false);
                tryAddShot(x, y, 2, 1, posMovs, false);
                tryAddShot(x, y, -2, -1, posMovs, false);
                tryAddShot(x, y, 2, -1, posMovs, false);
            }
        }
    }
    return posMovs.map(a=>new Position(a.weigh(()=>evaluate()), a))
        .filter(a=>a.value >= lowBound)
        .sort((a, b) => b.value - a.value)
        .map(a => a.move);
}
 
setTimeout(()=>drawToScreen(), 0);
 
let modeIndex = 0;
function toggle() {
    modeIndex++;
    modeIndex %= 2;
}
 
window.onkeydown = ({ key }) => {
    if (key == " ") {
        toggle();
        drawToScreen();
    }
    if (key == "Enter") {
        computerMove(0, true);
        drawToScreen();
        setTimeout(computerMove, 0, 0, true);
        drawToScreen();
        setTimeout(computerMove, 0);
    }
}

function recurSort(time, depth = 1, auto = true) {
    return new Promise(res => {
        let begin = performance.now();
        let final = minMax(depth, 0);
        let move = final.move;
        let total = performance.now() - begin;
        updateEval(final.value);
        document.getElementById("check").innerText = `${final.value} | ${depth}`;
        if (time*1000 < total) {
            document.getElementById(move.fx + "," + move.fy).style.backgroundColor = "#ffce1f";
            move.make();
            if (code && !board.secondTurn) {
                let loc = (document.location+"").split(document.location.pathname)[0];
                console.log(loc)
                document.body.innerHTML = `<a href="${loc}/?${convertToString()}">Link to game</a>`;
                res();
                console.log("HOLA")
                return;
            }
            setTimeout(()=>{
                drawToScreen();
                document.getElementById(move.fx + "," + move.fy).style.backgroundColor = "#ffce1f";
                document.getElementById(move.tx + "," + move.ty).style.backgroundColor = "#d9aa02";
                if (endGameCheck()) 
                    return;
                if (board.secondTurn && auto)
                    setTimeout(recurSort, 500, maxDepth);
                else
                    board.clearPositions();
            }, 500);
            res();
            return;
        }
        else {
            setTimeout(recurSort, 0, time - total/1000, depth+1);
        }
    });
}
