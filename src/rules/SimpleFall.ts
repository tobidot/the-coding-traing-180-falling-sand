import { z } from "zod";
import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";

export interface Settings {
}
export const definition_schema = z.object({
    name: z.literal("SimpleFall"),
    settings: z.object({}),
});
type Definition = z.infer<typeof definition_schema>;

/**
 * Let them fall
 */
export class SimpleFall extends Rule<Definition> {

    public constructor(
        public settings: Settings = {}
    ) {
        super();
    }

    public apply(source: State, target: State): State {
        for (let i = 0; i < target.cells.length; i++) {
            const target_cell = target.cells[i];
            const source_cell = source.cells[i];
            target_cell.value = source_cell.value;
            const above = source.at({ x: target_cell.position.x, y: target_cell.position.y - 1 });
            const center = source_cell;
            const below = source.at({ x: target_cell.position.x, y: target_cell.position.y + 1 });
            // if (!above) {
            //     // top row
            //     target_cell.value = 0;
            //     continue;
            // }   
            const is_solid_above = !!above && above.value > 0.5;
            const is_solid_center = center.value > 0.5;
            const is_solid_below = !below || below.value > 0.5;

            if (!is_solid_above && !is_solid_center && !is_solid_below) {
                target_cell.value = 0;
            }
            if (!is_solid_above && !is_solid_center && is_solid_below) {
                target_cell.value = 0;
            }
            if (!is_solid_above && is_solid_center && !is_solid_below) {
                target_cell.value = 0;
            }
            if (!is_solid_above && is_solid_center && is_solid_below) {
                target_cell.value = 1;
            }
            if (is_solid_above && !is_solid_center && !is_solid_below) {
                target_cell.value = 1;
            }
            if (is_solid_above && !is_solid_center && is_solid_below) {
                target_cell.value = 1;
            }
            if (is_solid_above && is_solid_center && !is_solid_below) {
                target_cell.value = 0;
            }
            if (is_solid_above && is_solid_center && is_solid_below) {
                target_cell.value = 1;
            }

        }
        return target;
    }

    public name() {
        return 'SimpleFall';
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
        $element.classList.add('rule-simple-fall');
        $element.innerText = 'Definition: SimpleFall';
        return $element;
    }
}