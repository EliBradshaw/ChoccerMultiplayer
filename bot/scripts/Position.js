export default class Position {
    constructor(value, move = null, isTerminal = false) {
        this.value = value;
        this.move = move;
        this.isTerminal = isTerminal;
    }
}