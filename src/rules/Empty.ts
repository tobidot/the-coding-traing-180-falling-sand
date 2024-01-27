import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";

export interface    Settings {
}

/**
 * Empty Ruleset does nothing
 */
export class Empty extends Rule {

    public constructor(
        settings: Settings = {}
    ) {
        super();
    }

    public apply(source: State, target: State) : State {
        target.cells.forEach((cell: Cell, index: number) => {
            cell.value = 0;
        });
        return target;
    }
}