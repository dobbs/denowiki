import {TurtleCanvas} from 'http://turtle.simple.localtest.me/assets/turtle/turtle-canvas.js';

export class Turtle extends TurtleCanvas {
  connectedCallback() {
    this.draw();
  }
  render(json) {
    this.id = json.id;
    this.text = "Turtle wants to be here";
    this.turn().move().turn().nextMovesize().move();
    this.history = this.turtle.history;
    this.save();
  }

  get json() {
    return {
      id: this.id,
      type: "turtle",
      text: this.text,
      history: this.history
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
