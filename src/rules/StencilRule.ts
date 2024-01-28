import { Vector2I } from "@game.object/ts-game-toolbox";
import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";
import { z } from "zod";

export interface Settings {
    stencil_size: Vector2I;
    sets: Array<Array<string>>;
}

export const definition_schema = z.object({
    name: z.literal("StencilRule"),
    settings: z.object({
        stencil_size: z.object({
            x: z.number(),
            y: z.number(),
        }),
        sets: z.array(z.array(z.string())),
    }),
});

type Definition = z.infer<typeof definition_schema>;

/**
 * Let them fall
 */
export class StencilRule extends Rule<Definition> {

    public settings: Settings;
    public stencil: Array<Cell | null>;

    public constructor(
        settings: Partial<Settings> = {
            stencil_size: { x: 3, y: 3 }
        }
    ) {
        super();
        this.settings = Object.assign({
            stencil_size: { x: 3, y: 3 },
            sets: StencilRule.make_snow_set(),
        }, settings);
        this.stencil = new Array(9);
    }

    public name() {
        return 'StencilRule';

    }

    public definition(): any {
        return {
            name: this.name(),
            settings: structuredClone(this.settings),
        }
    }

    public apply(
        source: State,
        target: State
    ): State {
        const sets = this.settings.sets;
        // .map((choices) => {
        //     return choices[Math.floor(Math.random() * choices.length)];
        // });
        for (let i = 0; i < target.cells.length; i++) {
            const target_cell = target.cells[i];
            const source_cell = source.cells[i];
            // target_cell.value = source_cell.value;
            const stencil = this.pick(source, target_cell.position.x, target_cell.position.y);

            if (target_cell.position.y === source.size.y - 1 && source_cell.value > 0.5) {
                target_cell.value = source_cell.value;
                continue;
            }

            const match = sets.reduce((match, set, set_index) => {
                // match one of the sets
                return match || set.reduce((match, state, state_index) => {
                    // match all cells in the set
                    const cell = stencil[state_index];
                    const next = match && this.match(cell, state);
                    return next;
                }, true);
            }, false);
            target_cell.value = match ? 1 : 0;
            // console.log('end');
        }
        return target;
    }

    public match(cell: Cell | null, state: string): boolean {
        switch (state) {
            case 'O': return !cell || cell.value < 0.5;
            case 'X': return !!cell && cell.value > 0.5;
            case '*': return true;
            default: return false;
        }
    }

    public pick(source: State, cx: number, cy: number): Array<Cell | null> {
        const offset_x = cx - Math.floor(this.settings.stencil_size.x / 2);
        const offset_y = cy + -Math.floor(this.settings.stencil_size.y / 2);
        for (let y = 0; y < this.settings.stencil_size.y; y++) {
            for (let x = 0; x < this.settings.stencil_size.x; x++) {
                const cell = source.at({ x: offset_x + x, y: offset_y + y });
                this.stencil[x + y * this.settings.stencil_size.x] = cell;
            }
        }
        return this.stencil;
    }

    public static make_snow_set() {
        return [
            [
                '*', 'X', '*',
                '*', 'O', '*',
                '*', '*', '*',
            ],
            [
                '*', 'X', '*',
                '*', 'X', '*',
                '*', 'X', '*',
            ],
            [
                '*', '*', '*',
                '*', 'X', '*',
                'X', 'X', 'X',
            ],

            [
                '*', '*', 'X',
                '*', 'O', 'X',
                '*', '*', '*',
            ],
            [
                'X', '*', '*',
                'X', 'O', '*',
                '*', '*', '*',
            ],
        ];
    }


    public import(definition: Definition): void {
        this.settings = definition.settings;
    }


    public visualize(): HTMLElement {
        const $element = document.createElement('div');
        $element.classList.add('rule-stencil-rule');
        $element.innerText = 'Definition: StencilRule';
        return $element;
    }
}