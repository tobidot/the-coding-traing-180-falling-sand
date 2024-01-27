import { Vector2 } from "@game.object/ts-game-toolbox";

export class Cell {
    public position: Vector2;
    public value: number;
    public fixed: boolean;

    constructor(
        position: Vector2,
        value: number
    ) {
        this.position = position;
        this.value = value;
        this.fixed = false;
    }
}