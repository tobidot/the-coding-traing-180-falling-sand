import { Rect, RectI, Vector2I } from "@game.object/ts-game-toolbox";
import { App } from "./App";
import { Cell } from "./Cell";

export class InputHandler {

    public $controls: HTMLFormElement;

    public constructor(
        public app: App,
    ) {
        this.$controls = document.forms.namedItem('controls')!;
    }

    public setup() {
        this.update_color_settings();
        (['negative', 'inactive', 'active', 'dense'] as const).forEach((name) => {
            (['start', 'end'] as const).forEach((suffix) => {
                const input = this.$controls.elements.namedItem(`${name}-${suffix}`) as HTMLInputElement;
                input.addEventListener('change', this.update_color_settings.bind(this));
            });
        });
        const input = this.$controls.elements.namedItem("wall") as HTMLInputElement;
        input.addEventListener('change', this.update_color_settings.bind(this));
    }

    public get tool() {
        const input = this.$controls.elements.namedItem('tool') as HTMLInputElement;
        return input.value;
    }

    public get simulation() {
        const input = this.$controls.elements.namedItem('simulation') as HTMLInputElement;
        return input.value;
    }

    public get is_running() {
        const input = this.$controls.elements.namedItem('is-running') as HTMLInputElement;
        return input.checked;
    }

    public update() {
        // drop some sand with the mouse
        if (this.app.sketch.mouseIsPressed) {
            const position = {
                x: Math.round(this.app.sketch.mouseX),
                y: Math.round(this.app.sketch.mouseY),
            };

            switch (this.tool) {
                case 'water':
                    this.drop_water(position);
                    break;
                case 'comet':
                    this.drop_comet(position);
                    break;
                case 'wall':
                    this.drop_wall(position);
                    break;
            }
        }
    }

    public drop_water(position: Vector2I) {
        const cell = this.app.automaton.props.current_state.at(position);
        if (!cell) {
            return;
        }
        cell.value = 1;
    }

    public drop_comet(position: Vector2I) {
        const density = 20;
        const rect = new Rect(
            position.x - 2, position.y - 2,
            5, 5
        );
        this.change_rect(rect, (cell: Cell) => {
            cell.value = density;
        });
    }

    public drop_wall(position: Vector2I) {
        const rect = new Rect(
            position.x - 1, position.y - 1,
            5, 5
        );
        this.change_rect(rect, (cell: Cell, buffer_cell: Cell) => {
            cell.value = 1;
            cell.fixed = true;
            buffer_cell.fixed = true;
            buffer_cell.value = 1;
        });
    }

    public change_rect(rect: RectI, cb: (cell: Cell, buffer_cell: Cell) => void) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
            for (let y = rect.y; y < rect.y + rect.h; y++) {
                const cell = this.app.automaton.props.current_state.at({ x, y });
                const buffer_cell = this.app.automaton.props.buffer_state.at({ x, y });
                if (!cell || !buffer_cell) {
                    continue;
                }
                cb(cell, buffer_cell);
            }
        }
    }


    public update_color_settings() {
        const wall = this.$controls.elements.namedItem('wall') as HTMLInputElement;
        this.app.renderer.color_settings.wall = this.app.sketch.color(wall.value);
        (['negative', 'inactive', 'active', 'dense'] as const).forEach((name) => {
            (['start', 'end'] as const).forEach((suffix) => {
                const input = this.$controls.elements.namedItem(`${name}-${suffix}`) as HTMLInputElement;
                const color = input.value;
                const rgba = this.app.sketch.color(color);
                this.app.renderer.color_settings[name][suffix] = rgba;
            });
        });
    }
}