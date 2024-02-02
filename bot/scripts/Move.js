import MoveData from "./MoveData.js";
import Piece from "./Piece.js";
import PieceData from "./PieceData.js";

export default class Move {
    constructor(fx, fy, tx, ty, moveType, board) {
        this.fx = fx;
        this.fy = fy;
        this.tx = tx;
        this.ty = ty;
        this.board = board;
        this.moveType = moveType;
        this.type = board[fx][fy].type;
        this.toType = board[tx][ty].type;
        this.pickedUp = board[tx][ty].hasBall;
        this.isRed = moveType == MoveData.STEAL ? this.toSquare.isRed : this.fromSquare.isRed;
    }
    /** @type {Piece} */
    get toSquare() {
        return this.board[this.tx][this.ty];
    }

    set toSquare(sqr) {
        this.board[this.tx][this.ty].swapWith(sqr, this.board);
    }

    /** @type {Piece} */
    get fromSquare() {
        return this.board[this.fx][this.fy];
    }

    set fromSquare(sqr) {
        this.board[this.fx][this.fy].swapWith(sqr, this.board);
    }

    make() {
        this.board.moveList.push(this);
        if (this.board.secondTurn)
            this.board.redTurn = !this.board.redTurn;
        this.board.secondTurn = !this.board.secondTurn;
        switch (this.moveType) {
            case MoveData.MOVE:
                this.pickedUp = this.toSquare.hasBall;
                this.toSquare.swapWith(this.fromSquare, this.board);
                if (this.pickedUp) {
                    this.toSquare.setBall(true);
                    this.fromSquare.setBall(false);
                }
            return;
            case MoveData.SWAP:
                this.pickedUp = (this.type == PieceData.TWO && this.toSquare.hasBall)
                this.toSquare.swapWith(this.fromSquare, this.board);
                if (this.pickedUp) {
                    this.toSquare.setBall(true);
                    this.fromSquare.setBall(false);
                }
            return;
            case MoveData.KICK:
                this.fromSquare.setBall(false);
                this.toSquare.setBall(true);
            return;
            case MoveData.STEAL:
                this.fromSquare.setBall(false);
                this.toSquare.setBall(true);
            return;
            case MoveData.GOAL:
                this.fromSquare.setBall(false);
                this.toSquare.setBall(true);
                if (this.tx == 0)
                    return this.board.didScoreRed = true;
            return this.board.didScoreBlack = true;
        }
    }

    undo() {
        this.board.moveList.pop();
        if (!this.board.secondTurn)
            this.board.redTurn = !this.board.redTurn;
        this.board.secondTurn = !this.board.secondTurn;
        switch (this.moveType) {
            case MoveData.MOVE:
                this.fromSquare.swapWith(this.toSquare, this.board);
                if (this.pickedUp) {
                    this.toSquare.setBall(true);
                    this.fromSquare.setBall(false);
                }
            return;
            case MoveData.SWAP:
                this.toSquare.swapWith(this.fromSquare, this.board);
                if (this.pickedUp) {
                    this.toSquare.setBall(true);
                    this.fromSquare.setBall(false);
                }
            return;
            case MoveData.KICK:
                this.fromSquare.setBall(true);
                this.toSquare.setBall(false);
            return;
            case MoveData.STEAL:
                this.fromSquare.setBall(true);
                this.toSquare.setBall(false);
            return;
            case MoveData.GOAL:
                this.fromSquare.setBall(true);
                this.toSquare.setBall(false);
                if (this.tx == 0)
                    return this.board.didScoreRed = false;
            return this.board.didScoreBlack = false;
        }
        this.board.secondTurn = !this.board.secondTurn;
    }

    toString() {
        return `${this.moveType}: ${this.fromSquare.x}, ${this.fromSquare.y} -> ${this.toSquare.x}, ${this.toSquare.y}`;
    }

    weigh(evaluate) {
        let outValue = 0;
        switch (this.moveType) {
            case MoveData.MOVE:
                outValue = 500;
                if (this.pickedUp)
                    outValue += 300;
            break;
            case MoveData.SWAP:
                if (this.toSquare.isRed == this.fromSquare.isRed)
                    outValue = 100;
                else
                    outValue = 600;
            break;
            case MoveData.KICK:
                if (this.toSquare.isEmpty())
                    outValue = 400;
                else if (this.toSquare.isRed == this.fromSquare.isRed)
                    outValue = 700;
                else
                    outValue = 400;
            break;
            case MoveData.STEAL:
                if (this.toSquare.isRed == this.fromSquare.isRed)
                    outValue = 0;
                else
                    outValue = 900;
            break;
            case MoveData.GOAL:
                outValue = 1000;
            break;
        }
        this.make();
        outValue += evaluate().value * 10;
        this.undo();
        return outValue;
    }
}