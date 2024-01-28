import { Vector2I, get_element_by_class_name, get_element_by_id, get_element_by_query_selector } from "@game.object/ts-game-toolbox";
import { Cell } from "../Cell";
import { Rule } from "../Rule";
import { State } from "../State";
import { z } from "zod";

export interface Settings {
    smoothing_factor?: number;
    stencil_size: Vector2I;
    smoothing_enabled: boolean;
    definition: Array<[Array<string>, Array<string | number>]>;
}

export const definition_schema = z.object({
    name: z.literal('StencilReplaceRule'),
    settings: z.object({
        stencil_size: z.object({
            x: z.literal(3),
            y: z.literal(3), // @TODO: make this dynamic
        }),
        smoothing_enabled: z.boolean(),
        smoothing_factor: z.optional(z.number()),
        definition: z.array(z.tuple([
            z.array(z.string()),
            z.array(z.union([z.string(), z.number()]))
        ]))
    })
});


type Definition = z.infer<typeof definition_schema>;

export const unit_size = 100000;
export const half_unit_size = 50000;

/**
 * Let them fall
 */
export class StencilReplaceRule extends Rule<Definition> {

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
            smoothing_enabled: true,
            smoothing_factor: 0.55,
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

            // apply rules
            const future = this.future.fill(0);
            const definitions = this.settings.definition;
            let accept_count = 0;
            for (let j = 0; j < definitions.length; j++) {
                const [condition, change] = definitions[j];
                if (this.match_stencil_condition(stencil, condition)) {
                    this.accept_change(future, change);
                    accept_count++;
                }
            }

            // apply changes
            // const normalize = Math.max(0, Math.min(1, source_cell.value));

            // keep old vaule
            target_cell.value += source_cell.value;
            // determine how much my value should smooth with my neighbours
            let spread = 0;
            if (this.settings.smoothing_enabled) {
                const offset = (source_cell.value - average);
                spread = Math.round(offset / neighbour_count * (this.settings.smoothing_factor ?? 0.55));
                target_cell.value -= spread * neighbour_count;
            }
            // apply rule changes
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
            // if (!Number.isInteger(target_cell.value)) {
            // }
        }
        console.log(target.cells.reduce((sum, cell) => sum + cell.value, 0));
        return target;
    }

    public accept_change(future: Array<number>, then: Readonly<Array<string | number>>): Array<number> {
        const r = Math.random() < 0.5 ? 1 : 0;
        for (let i = 0; i < future.length; i++) {
            const then_cell = then[i];
            if (typeof then_cell === 'number') {
                future[i] += Math.round(then_cell * unit_size);
                continue;
            }
            const weight = ({
                '+': 1,
                '*': 0,
                '-': -1,
                '-R': -r,
                '+R': r,
            }[then_cell] ?? 0) / 2;
            future[i] += Math.round(weight * unit_size);
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
            case 'O': return !!cell && cell.value <= half_unit_size;
            // filled
            case 'X': return !!cell && cell.value > half_unit_size;
            // any non wall / out of bounds
            case '.': return !!cell && !cell.fixed;
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

    public name() {
        return 'StencilReplaceRule';
    }

    public definition(): any {
        return {
            name: this.name(),
            settings: structuredClone(this.settings),
        }
    }




    public import(definition: Definition): void {
        this.settings = definition.settings;
        this.settings.definition.forEach((definition) => {
            definition[1] = definition[1].map((state, index) => {
                if (typeof (state) === 'number') {
                    return state;
                }
                const number = parseFloat(state);
                if (!isNaN(number)) {
                    return number;
                }
                return state;
            });

        })
    }


    public visualize(): HTMLElement {
        const $element = document.createElement('div');
        $element.classList.add('rule-wrapper', 'rule-stencil-replace');
        const $visualize_row_template = get_element_by_id('rule-visualizer-row-template', HTMLTemplateElement);
        const $visualize_cell_template = get_element_by_id('rule-visualizer-cell-template', HTMLTemplateElement);
        this.settings.definition.forEach((definition) => {
            const $row = $visualize_row_template.content.cloneNode(true) as DocumentFragment;
            const $condition = get_element_by_query_selector($row, '.rule-visualizer-condition', HTMLDivElement);
            const $apply = get_element_by_query_selector($row, '.rule-visualizer-apply', HTMLDivElement);
            const [condition, apply] = definition;
            condition.forEach((state, index) => {
                const $cell = $visualize_cell_template.content.cloneNode(true) as DocumentFragment;
                const $inner = get_element_by_query_selector($cell, '.rule-visualizer-cell', HTMLDivElement);
                // $inner.innerText = state;
                $inner.dataset.type = state.toString();
                // .add(`cell-${state}`);
                $condition.appendChild($cell);
            });
            apply.forEach((state, index) => {
                const $cell = $visualize_cell_template.content.cloneNode(true) as DocumentFragment;
                const $inner = get_element_by_query_selector($cell, '.rule-visualizer-cell', HTMLDivElement);
                if (state !== '*' && state !== '+' && state !== '-') {
                    $inner.innerText = typeof (state) === 'string'
                        ? state
                        : Math.abs(state).toString();
                }
                if (typeof (state) === 'string') {
                    $inner.dataset.type = state.charAt(0);
                } else {
                    if (state === 0) {
                        $inner.dataset.type = '*';
                    }
                    if (state > 0) {
                        $inner.dataset.type = '+';
                    }
                    if (state < 0) {
                        $inner.dataset.type = '-';
                    }
                }
                $apply.appendChild($cell);
            });
            $element.appendChild($row);
        });
        return $element;
    }

    public static make_snow_set_ex() {
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


    public static make_simple_fall_definition(): Definition {
        return {
            name: 'StencilReplaceRule',
            settings: {
                stencil_size: { x: 3, y: 3 },
                smoothing_enabled: true,
                smoothing_factor: 0.55,
                definition: [
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
                    ]
                ]
            }
        };
    }


    public static make_symetric_fall_definition(): Definition {
        return {
            name: 'StencilReplaceRule',
            settings: {
                stencil_size: { x: 3, y: 3 },
                smoothing_enabled: true,
                smoothing_factor: 0.55,
                definition: [
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
                    [
                        [
                            '*', '*', '*',
                            '*', 'X', '*',
                            'O', 'X', 'O',
                        ], [
                            '*', '*', '*',
                            '*', '-', '*',
                            0.5, '*', 0.5,
                        ]
                    ],
                    [
                        [
                            '*', '*', '*',
                            '*', 'X', '*',
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
                            '*', 'X', '*',
                            'X', 'X', 'O',
                        ], [
                            '*', '*', '*',
                            '*', '-', '*',
                            '*', '*', '+',
                        ]
                    ],
                ]
            }
        };
    }

    public static make_random_fall_definition(): Definition {
        return {
            name: 'StencilReplaceRule',
            settings: {
                stencil_size: { x: 3, y: 3 },
                smoothing_enabled: true,
                smoothing_factor: 0.55,
                definition: [
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
                    [
                        [
                            '*', '*', '*',
                            '*', 'X', '*',
                            'O', 'X', '*',
                        ], [
                            '*', '*', '*',
                            '*', '-R', '*',
                            '+R', '*', '*',
                        ]
                    ],
                    [
                        [
                            '*', '*', '*',
                            '*', 'X', '*',
                            'X', 'X', 'O',
                        ], [
                            '*', '*', '*',
                            '*', '-R', '*',
                            '*', '*', '+R',
                        ]
                    ]
                ]
            }
        }

    }

    public static make_complex_fall_definition(): Definition {

        return {
            name: 'StencilReplaceRule',
            settings: {
                stencil_size: { x: 3, y: 3 },
                smoothing_enabled: true,
                smoothing_factor: 0.55,
                definition: [
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
                ]
            }
        }
    }

    public static make_funhouse_definition(): Definition {
        return {
            name: 'StencilReplaceRule',
            settings: {
                stencil_size: { x: 3, y: 3 },
                smoothing_enabled: true,
                smoothing_factor: 0.55,
                definition: [
                    [
                        [
                            '*', '.', '*',
                            '.', 'X', '.',
                            '*', '.', '*',
                        ], [
                            '*', '+', '*',
                            '+', -2, '+',
                            '*', '+', '*',
                        ]
                    ],
                    // [
                    //     [
                    //         '*', '.', '*',
                    //         '*', 'X', '*',
                    //         '*', '*', '*',
                    //     ], [
                    //         '*', '+R', '*',
                    //         '*', '-R', '*',
                    //         '*', '*', '*',
                    //     ]
                    // ],
                ]
            }
        }
    }
}
