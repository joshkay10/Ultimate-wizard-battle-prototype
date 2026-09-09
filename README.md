# Ultimate Wizard Battle

Prototype. Open `index.html` over HTTP.

Six unique wizards: Ember, Ice, Gale, Earth, Lightning, Temporal. Each has its own cast.

- [Rules](RULES.md)
- [To-do](TODO.md)

Rules live in `js/sim.js` and do not need the DOM. The canvas UI plays the event log. Headless check:

```
node test/sim-node.js
```
