import { Rect, RectI, Vector2I, assert_never, get_element_by_id } from "@game.object/ts-game-toolbox";
import { App } from "./App";
import { Cell } from "./Cell";
import { StencilReplaceRule, definition_schema, unit_size } from "./rules/StencilReplaceRule";

export class InputHandler {

    public $controls: HTMLFormElement;
    public $rule_dialog: HTMLDialogElement;
    public $visualize_row_template: HTMLTemplateElement;
    public $visualize_cell_template: HTMLTemplateElement;

    public constructor(
        public app: App,
    ) {
        this.$controls = document.forms.namedItem('controls')!;
        this.$rule_dialog = get_element_by_id('rule-dialog', HTMLDialogElement);
        this.$visualize_row_template = get_element_by_id('rule-visualizer-row-template', HTMLTemplateElement);
        this.$visualize_cell_template = get_element_by_id('rule-visualizer-cell-template', HTMLTemplateElement);
    }

    public setup() {
        this.update_color_settings();
        (['negative', 'inactive', 'active', 'dense'] as const).forEach((name) => {
            (['start', 'end'] as const).forEach((suffix) => {
                get_element_by_id(`${name}-${suffix}`, HTMLInputElement).addEventListener('change', this.on_colors_change);
            });
        });
        get_element_by_id('wall', HTMLInputElement).addEventListener('change', this.on_colors_change);
        get_element_by_id('reset-empty', HTMLButtonElement).addEventListener('click', this.on_reset);
        get_element_by_id('reset-noise', HTMLButtonElement).addEventListener('click', this.on_reset);
        get_element_by_id('rule-dialog-open', HTMLButtonElement).addEventListener('click', this.on_show_rule_dialog);
        this.$rule_dialog.addEventListener('click', (event) => {
            if (event.target === this.$rule_dialog) {
                this.on_hide_rule_dialog();
            }
            event.stopPropagation();
            return false;
        });
        this.$rule_dialog.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        get_element_by_id('rule-dialog-close', HTMLButtonElement).addEventListener('click', this.on_hide_rule_dialog);
        get_element_by_id('rule-import', HTMLTextAreaElement).addEventListener('change', this.on_import_rule);
        get_element_by_id('rule-import', HTMLTextAreaElement).addEventListener('change', this.on_import_rule);
        get_element_by_id('rule-presets', HTMLSelectElement).addEventListener('change', this.on_import_preset_rule);
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

    public get width() {
        const input = this.$controls.elements.namedItem('width') as HTMLInputElement;
        return parseInt(input.value);
    }

    public get height() {
        const input = this.$controls.elements.namedItem('height') as HTMLInputElement;
        return parseInt(input.value);
    }

    public on_colors_change = () => {
        this.update_color_settings();
    }

    public on_reset = (event: Event) => {
        const target = event.target as HTMLButtonElement;
        this.reset(target.dataset.init!);
    }

    public reset(type: string) {
        this.app.automaton.settings.initial_state.size.x = this.width;
        this.app.automaton.settings.initial_state.size.y = this.height;
        switch (type) {
            case 'empty':
                this.app.automaton.settings.initial_state = this.app.automaton.make_state((cell: Cell) => {
                    cell.value = 0;
                    return cell;
                });
                break;
            case 'noise':
                this.app.automaton.settings.initial_state = this.app.automaton.make_state((cell: Cell) => {
                    cell.value = Math.round(Math.random() * unit_size);
                    return cell;
                });
                break;
            default:
                throw new Error(type);
        }
        this.app.automaton.start();
        this.app.sketch.resizeCanvas(this.width, this.height);
        this.app.sketch.loadPixels();
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
                case 'no_wall':
                    this.drop_no_wall(position);
                    break;
                case 'vacuum':
                    this.drop_vacuum(position);
                    break;
            }
        }
    }

    public drop_water(position: Vector2I) {
        const cell = this.app.automaton.props.current_state.at(position);
        if (!cell) {
            return;
        }
        cell.value = unit_size;
    }

    public drop_comet(position: Vector2I) {
        const density = unit_size * 20;
        const rect = new Rect(
            position.x - 2, position.y - 2,
            5, 5
        );
        this.change_rect(rect, (cell: Cell) => {
            cell.value = density;
        });
    }

    public drop_vacuum(position: Vector2I) {
        const rect = new Rect(
            position.x - 2, position.y - 2,
            5, 5
        );
        this.change_rect(rect, (cell: Cell, buffer_cell: Cell) => {
            cell.value = 0;
        });
    }
    public drop_wall(position: Vector2I) {
        const rect = new Rect(
            position.x - 1, position.y - 1,
            5, 5
        );
        this.change_rect(rect, (cell: Cell, buffer_cell: Cell) => {
            cell.value = 0;
            cell.fixed = true;
            buffer_cell.value = 0;
            buffer_cell.fixed = true;
        });
    }

    public drop_no_wall(position: Vector2I) {
        const rect = new Rect(
            position.x - 1, position.y - 1,
            5, 5
        );
        this.change_rect(rect, (cell: Cell, buffer_cell: Cell) => {
            cell.fixed = false;
            buffer_cell.fixed = false;
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
                const input = get_element_by_id(`${name}-${suffix}`, HTMLInputElement);
                const color = input.value;
                const rgba = this.app.sketch.color(color);
                this.app.renderer.color_settings[name][suffix] = rgba;
            });
        });
    }

    public refresh_export_rule() {
        const rule = this.app.automaton.settings.rule;
        const json = (() => {
            if (!(rule instanceof StencilReplaceRule)) {
                return JSON.stringify(rule.definition(), null, 4);
            }
            const definition = rule.definition();
            const custom = definition.settings.definition;
            definition.settings.definition = '--XXX--';
            const raw = JSON.stringify(definition, null, 4);
            const custom_json = custom.map((set: [Array<string>, Array<string | number>]) => {
                const [condition, apply] = set;
                let condition_rows = [];
                let apply_rows = [];
                for (let i = 0; i < condition.length; i += 3) {
                    condition_rows.push([condition[i], condition[i + 1], condition[i + 2]].map((value) => `"${value}"`));
                    apply_rows.push([apply[i], apply[i + 1], apply[i + 2]].map((value) => `"${value}"`));
                }
                return `\t\t[[   
\t\t\t${condition_rows.join(',\n\t\t\t')}
\t\t], [
\t\t\t${apply_rows.join(',\n\t\t\t')}
\t\t]]`;
            }).join(',\n');
            return raw.replace('"--XXX--"', `[
${custom_json}
\t]`);
        })();

        const textarea = get_element_by_id('rule-export', HTMLTextAreaElement);
        textarea.value = json;
    }

    public refresh_visualize_rule() {
        const visualizer = get_element_by_id('rule-visualizer', HTMLDivElement);
        const html = this.app.automaton.settings.rule.visualize();
        visualizer.innerHTML = '';
        visualizer.appendChild(html);
    }

    public on_import_preset_rule = () => {
        const select = get_element_by_id('rule-presets', HTMLSelectElement);
        const preset = ((preset) => {
            switch (preset) {
                case 'simple':
                    return StencilReplaceRule.make_simple_fall_definition();
                case 'symetric':
                    return StencilReplaceRule.make_symetric_fall_definition();
                case 'random':
                    return StencilReplaceRule.make_random_fall_definition();
                case 'complex':
                    return StencilReplaceRule.make_complex_fall_definition();
                case 'funhouse':
                    return StencilReplaceRule.make_funhouse_definition();
            }
        })(select.value);
        const textarea = get_element_by_id('rule-import', HTMLTextAreaElement);
        textarea.value = JSON.stringify(preset, null, 4);
        this.on_import_rule();
    }

    public on_import_rule = () => {
        const textarea = get_element_by_id('rule-import', HTMLTextAreaElement);
        textarea.classList.remove('error');
        textarea.title = '';
        try {
            const json = textarea.value;
            const import_definition = JSON.parse(json);
            const definition = definition_schema.parse(import_definition);
            this.app.automaton.settings.rule.import(definition);
            this.refresh_export_rule();
            this.refresh_visualize_rule();
        } catch (e) {
            if (e instanceof Error) {
                textarea.title = e.message;
            }
            textarea.classList.add('error');
        }
    }

    public on_show_rule_dialog = () => {
        this.$rule_dialog.show();
        this.refresh_export_rule();
        this.refresh_visualize_rule();
    }

    public on_hide_rule_dialog = () => {
        this.$rule_dialog.close();
    }

}