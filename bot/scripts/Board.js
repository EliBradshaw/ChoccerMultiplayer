import Move from "./Move.js";
import MoveData from "./MoveData.js";
import Piece from "./Piece.js";
import PieceData from "./PieceData.js";
/** @typedef {Piece[][]} Board */
export default class Board {
    static WIDTH = 8;
    static HEIGHT = 8;
    constructor(winner = false) {
        this.reset(winner);
    }

    reset(winner) {
        /** @type {Move[]} */
        this.moveList = [];
        this.keys = {};
        this.createZobristKeys();

        this.positions = {};
        this.steals = [];
        this.secondTurn = false;
        this.redTurn = !winner;
        this.didScoreBlack = false;
        this.didScoreRed = false;
        for (let i = 0; i < Board.HEIGHT; i++) {
            let row = [...new Array(Board.WIDTH)];
            this[i] = row.map((a, j)=>new Piece(i, j));
        }

        this[3][3].setType(PieceData.ONE).setColor(false);
        this[3][7].setType(PieceData.TWO).setColor(false);
        this[3][0].setType(PieceData.THREE).setColor(false);
        this[1][4].setType(PieceData.FOUR).setColor(false); 
        this[1][3].setType(PieceData.FIVE).setColor(false);
     
        this[4][4].setType(PieceData.ONE).setColor(true);
        this[4][0].setType(PieceData.TWO).setColor(true);
        this[4][7].setType(PieceData.THREE).setColor(true); 
        this[6][3].setType(PieceData.FOUR).setColor(true);
        this[6][4].setType(PieceData.FIVE).setColor(true);

        if (winner)
            this[3][3].setBall(true);
        else
            this[4][4].setBall(true);
    }
    
    lastTwo() {
        let index = this.moveList.length - this.secondTurn;
        let mov1 = this.moveList[index-2];
        let mov2 = this.moveList[index-1];
        return [mov1, mov2];
    }

    canSteal(from, to) {
        if (this.moveList.length < 4)
            return false;
        let [mov1, mov2] = this.lastTwo();
        let oneRight = mov1.toType == from.type && mov1.type == to.type && mov1.moveType == MoveData.STEAL;
        let twoRight = mov2.toType == from.type && mov2.type == to.type && mov2.moveType == MoveData.STEAL;
        return !(oneRight || twoRight);
    }

    canSwap(to, from) {
        if (this.moveList.length < 4)
            return false;
        let [mov1, mov2] = this.lastTwo();
        let oneRight = mov1.toType == from.type && mov1.type == to.type && mov1.moveType == MoveData.SWAP;
        let twoRight = mov2.toType == from.type && mov2.type == to.type && mov2.moveType == MoveData.SWAP;
        return !(oneRight || twoRight);
    }

    createZobristKeys() {
        let pieces = [
            PieceData.ONE,
            PieceData.TWO,
            PieceData.THREE,
            PieceData.FOUR,
            PieceData.FIVE
        ];

        this.keys[PieceData.BALL] = Math.random();
        for (let piece of pieces) {
            this.keys[piece] = Math.random();
            this.keys[piece+5] = Math.random();
        }
    }

    clearPositions() {
        this.positions = {};
    }

    zobrist() {
        let key = 0;
        let index = 0;
        let mul = 1;
        for (let x = 0; x < Board.WIDTH; x++) {
            for (let y = 0; y < Board.HEIGHT; y++) {
                index++;
                let piece = this[x][y];
                if (piece.hasBall)
                    key += index * this.keys[PieceData.BALL] * mul;
                else if (!piece.isEmpty())
                    key += index * this.keys[piece.type + piece.isRed * 5] * mul;
                else
                    mul += 1.1;
            }
        }
        return key;
    }

    storePosition(value) {
        this.positions[this.zobrist()] = value;
    }

    getPosition() {
        return this.positions[this.zobrist()];
    }
}