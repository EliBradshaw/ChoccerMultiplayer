const WIDTH = 8;
const HEIGHT = 8;
const boardChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890<>";

let isMyTurn = true;
let myColor = "red";
/** @type {Cell[][]} */
let board = [];
let highlighted = null;
let currentMoveType = "Move/Swap";
let currentMoveIndex = 0;
let isSecondMove = false;
let firstMove = null;
let lastTakes = {"red1": "black1", "black1": "red1"};
let lastSwaps = {"red1": "black1", "black1": "red1"};
let [loc, code] = document.location.toString().split('?');
let lastMoves = [];
code = code || "KKe9EMB8dHzr|-|-";
function convertToString(useCode = true) {
    let out = "";
    let pieces = [];
    for (let x in board) {
        for (let y in board[x]) {
            let cell = board[x][y];
            if (cell.isEmpty && !cell.hasBall)
                continue;
            if (cell.hasBall)
                pieces.unshift(cell);
            if (!cell.isEmpty)
                pieces.push(cell);
        }
    }
    let foundBall = false;
    pieces = pieces.map(a=>{
        return {
            a,
            value: (a.hasBall && !foundBall && (foundBall = true)) * 100 + (a.color == "red") * 10 - a.innerPiece * 1
        }
    }).sort((a, b) => b.value - a.value).map(a=>a.a);

    for (let piece of pieces) {
        out += boardChars[piece.x*8 + piece.y];
    }
    if (useCode) {
        out = code.split("|")[0];
        out = out.substring(0, out.length-1);
    }
    out += myColor == 'red' ? 'b' : 'r';
    out += "|";
    out += lastMoves[0] ? lastMoves[0].URIfy() : "-";
    out += "|";
    out += lastMoves[1] ? lastMoves[1].URIfy() : "-";
    return out;
}

function importFromString(string) {
    let num = 0;
    let color = "red";
    isMyTurn = false;
    for (let posChar of string) {
        let i = boardChars.indexOf(posChar);
        let x = i >> 3;
        let y = i % 8;
        if (num == 0) {
            board[x][y].hasBall = true;
        }
        else {
            board[x][y].innerPiece = num;
            board[x][y].color = color;
        }
        num++;
        if (num == 6) {
            num = 1;
            if (color == "black")
                break;
            color = "black";
        }
    }
    let lastMoves = string.split("|");
    let t = lastMoves.shift();
    let turn = t[t.length-1];
    myColor = turn == 'r' ? "red" : "black";
    lastMoves = lastMoves.map(a=> {
        if (a == "-")
            return null;
        return Move.unURIfy(a);
    });
    let gap = 500;
    for (let mov of lastMoves) {
        if (!mov)
            continue;
        setTimeout(()=> {
            mov.make(false);
        }, gap);
        gap *= 2;
    }
    setTimeout(()=> {
        isMyTurn = true;
        isSecondMove = false
        firstMove = null;
        lastMoves = [];
        code = convertToString(false);
    }, gap);
}

class Cell {
    constructor(x, y) {
        this.hasBall = false;
        this.color = "red";
        this.innerPiece = "0";
        this.isGoal = false;
        this.x = x;
        this.y = y;
    }

    /**
     * @param {String} p
     */
    set piece(p) {
        this.innerPiece = p[1];
        if (p[0] == "r")
            this.color = "red";
        else
            this.color = "black";
        if (p[2] == "b")
            this.hasBall = true;
    }
    
    get pieceAsWhole() {
        return this.color + this.innerPiece;
    }

    get piece() {
        return this.innerPiece;
    }

    get isEmpty() {
        return this.piece == "0";
    }

    swapWith(i, j) {
        let tmp = board[i][j].innerPiece;
        board[i][j].innerPiece = this.innerPiece;
        this.innerPiece = tmp;

        tmp = board[i][j].color;
        board[i][j].color = this.color;
        this.color = tmp;

        tmp = board[i][j].hasBall;
        board[i][j].hasBall = this.hasBall;
        this.hasBall = tmp;
    }
}

class Move {
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }

    URIfy() {
        return encodeURIComponent(JSON.stringify(this));
    }

    static unURIfy(URI) {
        let json = JSON.parse(decodeURIComponent(URI));
        return new Move(json.type, json.data);
    }

    make(keep = true) {
        if (keep)
            lastMoves.push(this);
        switch (this.type) {
            case "move":
                if (board[this.data.tx][this.data.ty].hasBall) {
                    board[this.data.tx][this.data.ty].hasBall = false;
                    board[this.data.fx][this.data.fy].hasBall = true;
                }
                board[this.data.fx][this.data.fy].swapWith(this.data.tx, this.data.ty);
                if (board[this.data.tx][this.data.ty].isGoal) {
                    if (this.data.ty < 3) {
                        if (myColor == "red")
                            setTimeout(alert, 500, "YOU WON");
                        else
                            setTimeout(alert, 500, "YOU LOST");
                    }
                    else {
                        if (myColor == "red")
                            setTimeout(alert, 500, "YOU LOST");
                        else
                            setTimeout(alert, 500, "YOU WON");
                    }
                }
                break;
            case "take":
                board[this.data.fx][this.data.fy].hasBall = false;
                board[this.data.tx][this.data.ty].hasBall = true;
                lastTakes[board[this.data.tx][this.data.ty].pieceAsWhole] = board[this.data.fx][this.data.fy].pieceAsWhole;
                break;
            case "pass":
                board[this.data.fx][this.data.fy].hasBall = false;
                board[this.data.tx][this.data.ty].hasBall = true;
                if (board[this.data.tx][this.data.ty].isGoal) {
                    if (this.data.ty < 3) {
                        if (myColor == "red")
                            setTimeout(alert, 500, "YOU WON");
                        else
                            setTimeout(alert, 500, "YOU LOST");
                    }
                    else {
                        if (myColor == "red")
                            setTimeout(alert, 500, "YOU LOST");
                        else
                            setTimeout(alert, 500, "YOU WON");
                    }
                }
                break;
            case "swap":
                if (board[this.data.tx][this.data.ty].hasBall && board[this.data.fx][this.data.fy].piece == "2") {
                    board[this.data.tx][this.data.ty].hasBall = false;
                    board[this.data.fx][this.data.fy].hasBall = true;
                }
                lastSwaps[board[this.data.tx][this.data.ty].pieceAsWhole] = board[this.data.fx][this.data.fy].pieceAsWhole;
                board[this.data.fx][this.data.fy].swapWith(this.data.tx, this.data.ty);
                break;
        }
        if (isSecondMove) {
            isMyTurn = !isMyTurn;
            isSecondMove = false;
            firstMove = null;
        }
        else {
            firstMove = this;
            isSecondMove = true;
        }
        drawToScreen();
    }
}

function tryMove(fx, fy, tx, ty, moves) {
    if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT)
        return;
    if (!board[tx][ty].isEmpty || board[tx][ty].isGoal)
        return;
    moves.push(new Move("move", {fx, fy, tx, ty}));
}

function tryTake(tx, ty, fx, fy, moves) {
    if (fx < 0 || fx >= WIDTH || fy < 0 || fy >= HEIGHT)
        return;
    if (!board[fx][fy].hasBall || board[fx][fy].isEmpty)
        return;
    moves.push(new Move("take", {fx, fy, tx, ty}));
}

function tryPass(fx, fy, dx, dy, moves, repeat = true) { // This will shoot out a ray in the direction and add a move if it hits one of it's own pieces
    let ox = fx;
    let oy = fy;
    let skim = board[fx][fy].piece == "1";
    do {
        fx += dx;
        fy += dy;
        if (fx < 0 || fx >= WIDTH || fy < 0 || fy >= HEIGHT)
            return;
        if (board[ox][oy].piece == "1" && !skim && board[fx][fy].isGoal)
            return;
        moves.push(new Move("pass", {fx: ox, fy: oy, tx: fx, ty: fy}));
        if (!board[fx][fy].isEmpty) {
            if (!skim)
                return;
            skim = false;
        }
    }
    while (repeat);
}

function trySwap(fx, fy, tx, ty, moves) {
    if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT)
        return;
    if (board[tx][ty].isEmpty)
        return;
    moves.push(new Move("swap", {fx, fy, tx, ty}));
}

function generateMovesFor(i, j, type) {
    let moves = [];
    switch (type.toLowerCase()) {
        case "move":
            if (firstMove && 
                firstMove.type == "move" && 
                board[firstMove.data.tx][firstMove.data.ty].piece == board[i][j].piece && 
                board[firstMove.data.tx][firstMove.data.ty].piece != "3")
                break;
            tryMove(i, j, i-1, j-1, moves);
            tryMove(i, j, i-1, j, moves);
            tryMove(i, j, i-1, j+1, moves);
            tryMove(i, j, i, j-1, moves);
            tryMove(i, j, i, j+1, moves);
            tryMove(i, j, i+1, j-1, moves);
            tryMove(i, j, i+1, j, moves);
            tryMove(i, j, i+1, j+1, moves);
            break;
        case "swap":
            trySwap(i, j, i-1, j-1, moves);
            trySwap(i, j, i-1, j, moves);
            trySwap(i, j, i-1, j+1, moves);
            trySwap(i, j, i, j-1, moves);
            trySwap(i, j, i, j+1, moves);
            trySwap(i, j, i+1, j-1, moves);
            trySwap(i, j, i+1, j, moves);
            trySwap(i, j, i+1, j+1, moves);
            for (let i = 0; i < moves.length; i++) {
                let move = moves[i];
                if (lastSwaps[board[move.data.fx][move.data.fy].pieceAsWhole] == board[move.data.tx][move.data.ty].pieceAsWhole) {
                    moves.splice(i--, 1);
                }
            }
            break;
        case "take/pass":
            tryTake(i, j, i-1, j-1, moves);
            tryTake(i, j, i-1, j, moves);
            tryTake(i, j, i-1, j+1, moves);
            tryTake(i, j, i, j-1, moves);
            tryTake(i, j, i, j+1, moves);
            tryTake(i, j, i+1, j-1, moves);
            tryTake(i, j, i+1, j, moves);
            tryTake(i, j, i+1, j+1, moves);
            if (board[i][j].piece != "4" && board[i][j].piece != "5") {
                for (let i = 0; i < moves.length; i++) {
                    let move = moves[i];
                    if (lastTakes[board[move.data.fx][move.data.fy].pieceAsWhole] == board[move.data.tx][move.data.ty].pieceAsWhole) {
                        moves.splice(i--, 1);
                    }
                }
            }
            if (!board[i][j].hasBall)
                break;
            tryPass(i, j, -1, -1, moves);
            tryPass(i, j, -1, 0, moves);
            tryPass(i, j, -1, 1, moves);
            tryPass(i, j, 0, -1, moves);
            tryPass(i, j, 0, 1, moves);
            tryPass(i, j, 1, -1, moves);
            tryPass(i, j, 1, 0, moves);
            tryPass(i, j, 1, 1, moves);
            if (board[i][j].piece == "2") {
                tryPass(i, j, -1, -2, moves, false);
                tryPass(i, j, -1, 2, moves, false);
                tryPass(i, j, 1, -2, moves, false);
                tryPass(i, j, 1, 2, moves, false);
                tryPass(i, j, -2, -1, moves, false);
                tryPass(i, j, -2, 1, moves, false);
                tryPass(i, j, 2, -1, moves, false);
                tryPass(i, j, 2, 1, moves, false);
            }
            break;
    }
    return moves;
}

function initBoard() {
    board = [];
    for (let i = 0; i < WIDTH; i++) {
        board.push([]);
        for (let j = 0; j < HEIGHT; j++) {
            board[i].push(new Cell(i, j));
        }
    }
    board[3][0].isGoal =
    board[4][0].isGoal =
    board[3][7].isGoal =
    board[4][7].isGoal = true;
    importFromString(code);
}
initBoard();

function drawToScreen() {
    let brd = document.getElementById("board");
    brd.style.display = "flex";
    brd.innerHTML = "";
    for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y++) {
            let i = x;
            let j = y;
            if (myColor == "black") {
                i = WIDTH - 1 - i;
                j = HEIGHT - 1 - j;
            }
            let square = document.createElement("div");
            square.className = "square";
            square.style.backgroundColor = (i&1) ^ (j&1) ? "#136d15" : "#41980a";
            square.id = i + "," + j;
            brd.appendChild(square);

            let piece = document.createElement("div");
            piece.id = i + "," + j + "c";
            if (board[i][j].hasBall)
                piece.style.boxShadow = "0px 0px 5px 5px white";
            if (highlighted && highlighted.x == i && highlighted.y == j && board[i][j].color == myColor) {
                if (board[i][j].hasBall)
                    piece.style.boxShadow = "0px 0px 5px 5px yellow";
                else
                    piece.style.boxShadow = "0px 0px 5px 5px orange";
            }
            piece.classList.add("piece");
            square.appendChild(piece);
            if (board[i][j].isEmpty) {
                if (!board[i][j].hasBall)
                    piece.style.opacity = 0;
                else
                    piece.style.background = "white"
                continue;
            }
            piece.style.backgroundColor = board[i][j].color == "red" ? "red" : "gray";
            piece.innerText = board[i][j].piece;
            brd.appendChild(square);
        }
    }
    let moveTypes = document.getElementById("move-types");
    moveTypes.innerHTML = "";
    if (!highlighted) {
        let newGame = document.createElement("form");
        newGame.action = loc;
        let innerNG = document.createElement("input");
        innerNG.value = "New Game";
        innerNG.type = "submit";
        newGame.appendChild(innerNG);
        let link = document.createElement("a");
        link.disabled = true;
        link.innerText = "Game link"
        link.href = `${loc}?${convertToString()}`;
        let copy = document.createElement("input");
        copy.value = "Copy Game Link";
        copy.type = "button";
        copy.onclick = () => {
            navigator.clipboard.writeText(link.href);
            copy.value = "Copied!";
        }
        moveTypes.appendChild(newGame);
        moveTypes.appendChild(link);
        moveTypes.appendChild(copy);
        return;
    }
    let types = ["Move", "Take/Pass", "Swap"];
    types = types.filter(t => generateMovesFor(highlighted.x, highlighted.y, t).length > 0);
    if (currentMoveIndex >= types.length) {
        currentMoveIndex = 0;
        highlighted = null;
        return;
    }
    currentMoveType = types[currentMoveIndex];
    if (currentMoveType.indexOf(currentMoveType) == -1)
        currentMoveIndex = 0;
    currentMoveType = types[currentMoveIndex];
    for (let move of generateMovesFor(highlighted.x, highlighted.y, currentMoveType)) {
        let thing;
        if (move.type == "move") {
            square = document.getElementById(move.data.tx + "," + move.data.ty);
            thing = document.getElementById(move.data.tx + "," + move.data.ty + "c");
            thing.classList.remove("piece");
            thing.style.opacity = 1;
            thing.classList.add("move");
            square.appendChild(thing);
        }
        else if (move.type == "take") {
            thing = document.getElementById(move.data.fx + "," + move.data.fy + "c");
            thing.style.boxShadow = "0px 0px 5px 5px red";
        }
        else if (move.type == "pass") {
            if (board[move.data.tx][move.data.ty].isEmpty) {
                square = document.getElementById(move.data.tx + "," + move.data.ty);
                thing = document.getElementById(move.data.tx + "," + move.data.ty + "c");
                thing.classList.remove("piece");
                thing.style.opacity = 1;
                thing.classList.add("move");
                thing.style.backgroundColor = "blue";
                thing.style.boxShadow = "0px 0px 5px 3px blue";
                if (board[move.data.tx][move.data.ty].isGoal) {
                    thing.style.backgroundColor = "green";
                    thing.style.boxShadow = "0px 0px 5px 3px green";
                }
                square.appendChild(thing);
            }
            else {
                thing = document.getElementById(move.data.tx + "," + move.data.ty + "c");
                thing.style.boxShadow = "0px 0px 5px 5px blue";
            }
        }
        else if (move.type == "swap") {
            thing = document.getElementById(move.data.tx + "," + move.data.ty + "c");
            thing.style.boxShadow = "0px 0px 5px 5px teal";
        }

        thing.addEventListener("click", e => {
            highlighted = null;
            currentMoveIndex = 0;
            move.make();
        })
    }
}
document.body.onclick = (e) => {
  if (!isMyTurn) {
    return;
  }

  let trg = e.target;

  if (trg.id.length == 0 || trg.id.length > 4)
    return;
  let [x, y] = trg.id.split("c").join("").split(",").map(Number);
  if (board[x][y].isEmpty || board[x][y].color != myColor)
    return;
  if (highlighted && highlighted.x == x && highlighted.y == y)
    currentMove = [++currentMoveIndex];
  else
    currentMoveType = 0;
  highlighted = {x, y};
  drawToScreen();
}

drawToScreen();