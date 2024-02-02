import PieceData from "./PieceData.js";

export default class Piece {
    static NameData = new Map();
    static _setNameData = (() => {
        Piece.NameData.set(PieceData.EMPTY, " ");
        Piece.NameData.set(PieceData.BALL, " ");
        Piece.NameData.set(PieceData.ONE, "1");
        Piece.NameData.set(PieceData.TWO, "2");
        Piece.NameData.set(PieceData.THREE, "3");
        Piece.NameData.set(PieceData.FOUR, "4");
        Piece.NameData.set(PieceData.FIVE, "5");
    })();
    constructor(x, y, type = PieceData.EMPTY, isRed = false) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isRed = isRed;
        this.hasBall = false;
    }

    swapWith(other, board) {
        let ox = other.x, oy = other.y, ot = other.type, or = other.isRed, ob = other.hasBall;
        other.x = this.x;
        other.y = this.y;
        other.type = this.type;
        other.isRed = this.isRed;
        other.hasBall = this.hasBall;
        this.x = ox;
        this.y = oy;
        this.type = ot;
        this.isRed = or;
        this.hasBall = ob;
    }

    setColor(isRed) {
        this.isRed = isRed;
        return this;
    }

    setType(type) {
        this.type = type;
        return this;
    }

    setBall(ball) {
        this.hasBall = ball;
        return this;
    }

    stringify() {
        return Piece.NameData.get(this.type) + (this.isRed ? 'r':'b');
    }

    isEmpty() {
        return this.type == PieceData.EMPTY;
    }
}