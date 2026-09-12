# Ultimate Wizard Battle

Prototype. Open over HTTP — not `file://`.

```
npm start
```

Then [http://127.0.0.1:8080/](http://127.0.0.1:8080/). Live GitHub Pages: [joshkay10.github.io/Ultimate-wizard-battle-prototype](https://joshkay10.github.io/Ultimate-wizard-battle-prototype/).

Six kits in the pool. You bring four. Copies are allowed, and each body brings one spell from its element. Pick them on [Team](team.html) for **Vs**. The campaign locks a four per island.

- [Play](index.html)
- [Team](team.html)
- [Rules](rules.html) — rendered from `RULES.md`
- [Elements](elements.html)
- [To-do](todo.html) — rendered from `TODO.md`

Rules live in `js/domain/` and do not need the DOM. The canvas UI plays the event log.

```
npm test
```

`js/scripts.js` is the only script list. How to add files, where tests go, and what not to break: [AGENTS.md](AGENTS.md).
