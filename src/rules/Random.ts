import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";

export interface Settings {
}

/**
 * Changes all cells to random values
 */
export class Random extends Rule {

    public constructor(
        settings: Settings = {}
    ) {
        super();
    }

    public apply(source: State, target: State) : State {
        for (let i = 0; i < target.cells.length; i++) {
            target.cells[i].value  = Math.random();
        }
        return target;
    }
}