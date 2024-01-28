import { State } from "./State";

export abstract class Rule<DEFINITION> {
    public abstract apply(source: State, target: State): State;

    public abstract name(): string;

    public abstract definition(): DEFINITION;

    public abstract import(definition: DEFINITION): void;

    public abstract visualize(): HTMLElement;
}