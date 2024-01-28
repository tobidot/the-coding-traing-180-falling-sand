import { Rect, RectI, Vector2 } from "@game.object/ts-game-toolbox";
import { App } from "./App";
import { Automaton } from "./Automaton";
import p5, { Color } from "p5";
import { Cell } from "./Cell";
import { half_unit_size, unit_size } from "./rules/StencilReplaceRule";


export class Renderer {
    public color_settings!: ColorSettings;

    constructor(
        public app: App,
    ) {
    }

    public setup() {
        const rgba_black = this.app.sketch.color(0, 0, 0, 255);
        this.app.sketch.loadPixels();
        this.color_settings = {
            negative: {
                start: rgba_black,
                end: rgba_black,
            },
            inactive: {
                start: rgba_black,
                end: rgba_black,
            },
            active: {
                start: rgba_black,
                end: rgba_black,
            },
            dense: {
                start: rgba_black,
                end: rgba_black,
            },
            wall: rgba_black,
        };
    }

    public draw() {
        const window_size = new Vector2(this.app.sketch.width, this.app.sketch.height);
        const automaton_size = this.app.automaton.size;
        const top_left = window_size.mul(0.5).sub(automaton_size.cpy().mul(0.5));
        const target = new Rect(top_left.x, top_left.y, automaton_size.x, automaton_size.y);
        this.draw_automaton(
            this.app.automaton,
            target
        );
    }


    protected draw_automaton(
        automaton: Automaton,
        target: RectI
    ) {
        if (!automaton.props.current_state) {
            return;
        }
        const sketch = this.app.sketch;

        for (let x = target.x; x < target.x + target.w; x++) {
            for (let y = target.y; y < target.y + target.h; y++) {
                const cell = automaton.props.current_state.at({ x: x - target.x, y: y - target.y });
                if (!cell) continue;
                const index = (x + y * sketch.width) * 4;
                const color = this.get_color_for_cell(cell);
                sketch.pixels[index + 0] = sketch.red(color);
                sketch.pixels[index + 1] = sketch.green(color);
                sketch.pixels[index + 2] = sketch.blue(color);
                sketch.pixels[index + 3] = sketch.alpha(color);
            }
        }

        sketch.updatePixels();
    }

    public get_color_for_cell(cell: Cell): p5.Color {
        const sketch = this.app.sketch;
        if (cell.fixed) {
            return this.color_settings.wall;
        } else if (cell.value < 0) {
            // negative
            const factor = Math.atan(Math.abs(cell.value / unit_size)) * 2 / Math.PI;

            return sketch.lerpColor(
                this.color_settings.negative.start,
                this.color_settings.negative.end,
                factor
            );
        } else if (cell.value <= half_unit_size) {
            // inactive
            const factor = 1 - cell.value / half_unit_size;
            return sketch.lerpColor(
                this.color_settings.inactive.start,
                this.color_settings.inactive.end,
                factor
            );
        } else if (cell.value <= unit_size) {
            // active
            const factor = cell.value / unit_size;
            return sketch.lerpColor(
                this.color_settings.active.start,
                this.color_settings.active.end,
                factor
            );
        } else {
            // dense
            const factor = Math.atan(cell.value / unit_size) * 2 / Math.PI;
            return sketch.lerpColor(
                this.color_settings.dense.start,
                this.color_settings.dense.end,
                factor
            );
        }

    }
}

interface ColorSettings {
    negative: {
        start: Color;
        end: Color;
    },
    inactive: {
        start: Color;
        end: Color;
    },
    active: {
        start: Color;
        end: Color;
    },
    dense: {
        start: Color;
        end: Color;
    },
    wall: Color;
}