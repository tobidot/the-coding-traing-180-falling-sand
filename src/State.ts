import { Vector2I } from "@game.object/ts-game-toolbox";
import { Cell } from "./Cell";

export class State {
    constructor(
        public time: number,
        public size: Vector2I,
        public cells: Array<Cell>
    ) {
    }

    public at(position: Vector2I): Cell | null {
        if (position.x < 0 || position.x >= this.size.x) return null;
        if (position.y < 0 || position.y >= this.size.y) return null;
        return this.cells[position.x + position.y * this.size.x];
    }

    public cpy(): State {
        return new State(
            this.time,
            this.size,
            this.cells.map((cell) => cell.cpy()),
        );
    }
}