import {TurtleCanvas} from 'http://turtle.simple.localtest.me/assets/turtle/turtle-canvas.js';

// don't like having render(json) and json() need to know to ask
// this for the turtle, to get the history. demeter violation and also
// asking instead of telling
export class Turtle extends TurtleCanvas {
  connectedCallback() {
    this.draw();
  }
  set json(json) {
    console.log({where:'Turtle set json', json});
    this.id = json.id;
    if (! this.text) {
      this.text = "Turtle wants to be here";
    }
    if (this.turtle.history.length === 0) {
      this.turn().move().turn().nextMovesize().move();
      this.save();
    } else {
      this.turtle._history = json.history
    }
  }

  get json() {
    console.log({where: 'Turtle get json'});
    return {
      id: this.id,
      type: "turtle",
      text: this.text,
      history: [...this.turtle.history]
    }
  }

  async save() {
    try {
      this.style.backgroundColor = "rgba(255, 0, 0, 0.25)"
      let resp = await fetch(`/turtle/save`, {method: "POST", body: JSON.stringify(this.json)})
      let json = await resp.json()
      if (json.success) {
        this.style.backgroundColor = ""
        return
      }
      console.log("Unable to save", json)
    } catch(e) {
      console.log("Unable to save", e)
    }

  }
}
registerPlugin("turtle", Turtle);
