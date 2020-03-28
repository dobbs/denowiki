import {TurtleCanvas} from 'http://turtle.simple.localtest.me/assets/turtle/turtle-canvas.js';

export class Turtle extends TurtleCanvas {
  render(json) {
  }
}
registerPlugin("turtle", Turtle);
