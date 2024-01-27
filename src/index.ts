import p5 from 'p5';
import { App } from './App';
import { get_element_by_id } from '@game.object/ts-game-toolbox';

const root = get_element_by_id('app');
const canvas = get_element_by_id('canvas', HTMLCanvasElement);
const context = canvas.getContext('2d', {willReadFrequently: true});
const instance = new p5((sketch: p5) => {
    (<any>window).app = new App(sketch);
}, root);
