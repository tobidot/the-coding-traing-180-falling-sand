import { z } from "zod";
import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";

export interface Settings {
}
export const definition_schema = z.object({
    name: z.literal("Random"),
    settings: z.object({}),
});
type Definition = z.infer<typeof definition_schema>;

/**
 * Changes all cells to random values
 */
export class Random extends Rule<Definition> {

    public constructor(
        public settings: Settings = {}
    ) {
        super();
    }

    public apply(source: State, target: State): State {
        for (let i = 0; i < target.cells.length; i++) {
            target.cells[i].value = Math.random();
        }
        return target;
    }

    public name() {
        return 'Random';
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
        $element.classList.add('rule-random');
        $element.innerText = 'Definition: Random';
        return $element;
    }
}