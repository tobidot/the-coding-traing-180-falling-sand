import { z } from "zod";
import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";

export interface Settings {
}

export const definition_schema = z.object({
    name: z.literal("Empty"),
    settings: z.object({}),
});

type Definition = z.infer<typeof definition_schema>;

/**
 * Empty Ruleset does nothing
 */
export class Empty extends Rule<Definition> {

    public constructor(
        public settings: Settings = {}
    ) {
        super();
    }

    public apply(source: State, target: State): State {
        target.cells.forEach((cell: Cell, index: number) => {
            cell.value = 0;
        });
        return target;
    }

    public name(): string {
        return 'Empty';
    }

    public definition(): any {
        return {
            name: this.name(),
            settings: structuredClone(this.settings),
        }
    }

    public import(definition: Definition): void {

    }

    public visualize(): HTMLElement {
        const $element = document.createElement('div');
        $element.classList.add('rule-empty');
        $element.innerText = 'Definition: Empty';
        return $element;
    }
}