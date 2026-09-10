# Ultimate Wizard Battle

Prototype. Open `index.html` over HTTP.

Six kits in the pool. You bring four. Copies are allowed, and each body brings one spell from its element. Pick them on [Team](team.html); the enemy rolls four each match.

- [Battle](index.html)
- [Team](team.html)
- [Rules](rules.html)
- [Elements](elements.html)
- [To-do](todo.html)

Rules live in `js/domain/` and do not need the DOM. The canvas UI plays the event log. Headless check:

```
node test/sim-node.js
```
