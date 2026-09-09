# Ultimate Wizard Battle

Prototype. Open `index.html` over HTTP.

Three unique wizards: Pyre, Rime, Squall. Each has its own cast.

- [Battle](index.html)
- [Rules](rules.html)
- [Elements](elements.html)
- [To-do](todo.html)

Rules live in `js/sim.js` and do not need the DOM. The canvas UI plays the event log. Headless check:

```
node test/sim-node.js
```
