import { Vector2 } from "@game.object/ts-game-toolbox";
import { Rule } from "./Rule";
import { State } from "./State";
import { Cell } from "./Cell";

export interface Settings {
    initial_state: State,
    rule: Rule<any>,
}

export class Automaton {
    public props: Properties;
    public settings: Settings;

    public constructor(
        settings: Settings,
    ) {
        this.settings = settings;
        this.props = new Properties(this);
    }

    public get size(): Vector2 {
        return new Vector2(this.settings.initial_state.size);
    }

    public make_state(
        callback: (cell: Cell) => Cell = (cell) => cell,
    ): State {
        return new State(
            0,
            this.size,
            [...new Array<Cell>(this.size.x * this.size.y)].map((_, i) => {
                return callback(new Cell(new Vector2(i % this.size.x, Math.floor(i / this.size.x)), 0));
            })
        );
    }

    public start() {
        this.props.time = 0;
        this.props.current_state = this.settings.initial_state.cpy();
        this.props.buffer_state = this.settings.initial_state.cpy();
    }

    public step() {
        if (!this.props.current_state) {
            throw new Error('Automaton is not correctly started');
        }
        this.props.time++;
        const target = this.settings.rule.apply(
            this.props.current_state, this.props.buffer_state
        );
        this.props.buffer_state = this.props.current_state;
        this.props.current_state = target;
        return this.props.current_state;
    }

}


export class Properties {
    public time: number = 0;
    public buffer_state: State
    public current_state: State;

    public constructor(
        public parent: Automaton,
    ) {
        this.buffer_state = this.parent.make_state();
        this.current_state = this.parent.make_state();
    }

}
