import { State } from "./State";

export abstract class Rule {
    public abstract apply(source: State, target: State) : State;
}