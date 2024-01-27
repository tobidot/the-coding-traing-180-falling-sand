import { Vector2I } from "@game.object/ts-game-toolbox";
import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";

export interface Settings {
    stencil_size: Vector2I;
    definition: Array<[Array<string>, Array<string | number>]>;
}

/**
 * Let them fall
 */
export class StencilReplaceRule extends Rule {

    public settings: Settings;
    public stencil: Array<Cell | null>;
    public future: Array<number>;

    public constructor(
        settings: Partial<Settings> = {
            stencil_size: { x: 3, y: 3 }
        }
    ) {
        super();
        this.settings = Object.assign({
            stencil_size: { x: 3, y: 3 },
            definition: StencilReplaceRule.make_snow_set(),
        }, settings);
        this.stencil = new Array(9);
        this.future = new Array(9);
    }

    public apply(
        source: State,
        target: State
    ): State {
        target.cells.forEach((cell) => { cell.value = 0 });
        for (let i = 0; i < target.cells.length; i++) {
            const target_cell = target.cells[i];
            const source_cell = source.cells[i];
            if (target_cell.fixed) {
                target_cell.value = source_cell.value;
                continue;
            }
            // get neighbour state
            const stencil: Array<Cell | null> = this.pick(source, target_cell.position.x, target_cell.position.y);
            for (let i = 0; i < stencil.length; i++) {
                const cell = stencil[i];
                if (cell !== null && cell.fixed) {
                    stencil[i] = null;
                };
            }
            const neighbour_count = stencil.reduce((sum, cell) => {
                return sum + ((!!cell) ? 1 : 0);
            }, 0);
            const average = stencil.reduce((sum, cell) => {
                return sum + ((!!cell) ? cell.value : 0);
            }, 0) / neighbour_count;
            if (target_cell.position.y === source.size.y - 1 && source_cell.value > 0.5) {
                target_cell.value = source_cell.value;
                continue;
            }

            // apply rules
            const future = this.future.fill(0);
            const definitions = this.settings.definition;
            let accept_count = 0;
            for (let j = 0; j < definitions.length; j++) {
                const [condition, then] = definitions[j];
                if (this.match_stencil_condition(stencil, condition)) {
                    this.accept(future, then);
                    accept_count++;
                }
            }
            // apply changes
            // const normalize = Math.max(0, Math.min(1, source_cell.value));
            // const spread = (source_cell.value - normalize) / neighbour_count;
            // target_cell.value += normalize;
            const offset = (source_cell.value - average);
            const spread = -offset / neighbour_count;
            target_cell.value += source_cell.value - offset;
            stencil.forEach((cell, index) => {
                if (!cell || cell.fixed) {
                    return;
                }
                const target_cell = target.at(cell.position);
                if (target_cell) {
                    const future_cell = future[index];
                    if (!target_cell.fixed) {
                        // target_cell.value += future_cell * source_cell.value + spread;
                        target_cell.value += future_cell + spread;
                    }
                }
            });
        }
        console.log(target.cells.reduce((sum, cell) => sum + cell.value, 0));
        return target;
    }

    public accept(future: Array<number>, then: Readonly<Array<string | number>>): Array<number> {
        const r = Math.random() < 0.5 ? 1 : 0;
        for (let i = 0; i < future.length; i++) {
            const then_cell = then[i];
            if (typeof then_cell === 'number') {
                future[i] += then_cell;
                continue;
            }
            const weight = ({
                '+': 1,
                '*': 0,
                '-': -1,
                '-R': -r,
                '+R': r,
            }[then_cell] ?? 0) / 2;
            future[i] += weight;
        }
        return future;
    }

    public match_stencil_condition(stencil: Array<Cell | null>, condition: Array<string>): boolean {
        for (let i = 0; i < stencil.length; i++) {
            if (!this.match_cell(stencil[i], condition[i])) {
                return false;
            }
        }
        return true;
    }

    public match_cell(cell: Cell | null, state: string): boolean {
        switch (state) {
            // out of bounds
            case '#': return !cell;
            // empty
            case 'O': return !!cell && cell.value < 0.5;
            // filled
            case 'X': return !!cell && cell.value > 0.5;
            // any
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
                [
                    '*', '*', '*',
                    '*', 'X', '*',
                    '*', 'O', '*',
                ], [
                    '*', '*', '*',
                    '*', '-', '*',
                    '*', '+', '*',
                ]
            ],
            // [
            //     [
            //         '*', 'X', '*',
            //         '*', 'X', '*',
            //         '*', 'X', '*',
            //     ], [
            //         '*', -0.25, '*',
            //         '*', '*', '*',
            //         '*', +0.25, '*',
            //     ]
            // ],
            [
                [
                    '*', 'X', '*',
                    '*', 'O', '*',
                    '*', 'O', '*',
                ], [
                    '*', '-', '*',
                    '*', '*', '*',
                    '*', '+', '*',
                ]
            ],
            // [
            //     [
            //         'X', 'X', 'X',
            //         'X', 'X', 'X',
            //         '*', 'X', '*',
            //     ], [
            //         '*', '*', '*',
            //         '*', '-', '*',
            //         '*', '+', '*',
            //     ]
            // ],
            [
                [
                    '*', '*', '*',
                    '*', 'X', 'O',
                    'X', 'X', 'O',
                ], [
                    '*', '*', '*',
                    '*', '-', '*',
                    '*', '*', '+',
                ]
            ],
            [
                [
                    '*', '*', '*',
                    'O', 'X', '*',
                    'O', 'X', 'X',
                ], [
                    '*', '*', '*',
                    '*', '-', '*',
                    '+', '*', '*',
                ]
            ],
            [
                [
                    '*', '*', '*',
                    'O', 'X', 'O',
                    'O', 'X', 'O',
                ], [
                    '*', '*', '*',
                    '*', '-R', '*',
                    '+R', '*', '*',
                ]
            ],
            [
                [
                    '*', '*', '*',
                    'O', 'X', 'O',
                    'O', 'X', 'O',
                ], [
                    '*', '*', '*',
                    '*', '-R', '*',
                    '*', '*', '+R',
                ]
            ],
        ];
    }
}