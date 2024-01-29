import p5 from 'p5';
import { Renderer } from './Renderer';
import { Automaton } from './Automaton';
import { State } from './State';
import { Cell } from './Cell';
import { Vector2, get_element_by_id } from '@game.object/ts-game-toolbox';
import { StencilReplaceRule } from './rules/StencilReplaceRule';
import { InputHandler } from './InputHandler';

export class App {

    public renderer: Renderer;
    public input: InputHandler;
    public automaton: Automaton;

    constructor(
        public sketch: p5,
    ) {
        sketch.setup = this.setup.bind(this);
        sketch.draw = this.draw.bind(this);
        sketch.mousePressed = this.mousePressed.bind(this);
        this.automaton = new Automaton({
            initial_state: this.make_initial_state(300, 300),
            // rule: new StencilRule(),
            rule: new StencilReplaceRule(),
        });
        this.automaton.start();
        this.renderer = new Renderer(this);
        this.input = new InputHandler(this);
    }

    public mousePressed() {
    }

    public setup() {
        const canvas = get_element_by_id('canvas', HTMLCanvasElement);
        this.sketch.createCanvas(300, 300, canvas);
        this.sketch.frameRate(60);
        this.sketch.pixelDensity(1);
        this.renderer.setup();
        this.input.setup();
        this.input.reset("noise");
    }

    public draw() {
        if (this.input.is_running) {
            this.automaton.step();
        }
        this.renderer.draw();
        this.input.update();
    }

    public make_initial_state(
        width: number,
        height: number,
    ) {
        const cells = new Array<Cell>(width * height);
        for (let i = 0; i < cells.length; i++) {
            cells[i] = new Cell(
                new Vector2(i % width, Math.floor(i / width)),
                //Math.random() > 0.75 ? 1 : 0
                0
            );
        }
        return new State(0, { x: width, y: height }, cells);
    }
}