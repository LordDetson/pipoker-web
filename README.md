# PiPoker Web App

**Try it: [pipoker.app](https://pipoker.app)** — free online Planning Poker, no sign-up.

PiPoker is free online Planning Poker: a team opens a room, everyone picks a card, and the votes are revealed at once.
This repository is the web client, built with Angular, NgRx and Bootstrap. It talks to the backend,
[pipoker-app](https://github.com/LordDetson/pipoker-app), over STOMP on WebSocket; the server setup is in
[pipoker-docker-config](https://github.com/LordDetson/pipoker-docker-config).

## Features
**Rooms without registration:** create a room, share the invitation link, and people join as voters or watchers.

**Real-time updates:** everyone in the room sees who has voted, and the cards of all voters are revealed together.

**Card decks:** preset decks or your own deck for each room.

**Estimate history:** the results of the last rounds in a side panel.

**Install as an app:** Chrome and Edge offer to install PiPoker from the address bar, and it then opens in its own
window from the desktop or the home screen (`src/manifest.webmanifest`). The app works online only, there is no
service worker, so every start loads the current release.

**Russian and English:** the language follows the browser and can be switched in the header.

## Development
`npm start` serves the client on http://localhost:4200 and expects the backend on http://localhost:8080
(see `src/env/env.ts`). The production build (`npm run build`) connects to `/ws` on the domain it is served from.

## Tests
Run the tests with `npx ng test --watch=false --code-coverage` (add `--browsers=ChromeHeadlessCI` where there is no display).
The coverage report is written to `coverage/pipoker-web`.

- Unit tests sit next to the code they test: services, NgRx reducers, selectors and effects, and every component.
- Integration tests in `src/app/integration` run the whole client (components, store, effects and services)
  against an in-memory imitation of the pipoker-app STOMP API from `src/app/testing/fake-stomp.ts`.
  Only the STOMP connection is replaced, so no backend is needed.

## Releases
GitHub Actions (`.github/workflows/ci.yml`) builds and tests every pull request. Every push to main also publishes
the image `ghcr.io/lorddetson/pipoker-web`, which the QA environment picks up within a few minutes.
A commit checked on QA goes to PROD through the **Promote to PROD** workflow (`.github/workflows/promote.yml`),
which waits for approval.

## Contributing
We welcome contributions from the community to enhance PiPoker Web Application. If you have any ideas, bug reports, or feature requests, please feel free to submit them in the Issues section of our GitHub repository. We appreciate your support in making PiPoker even better.

## License
PiPoker is released under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt). You are free to use, modify, and distribute this software in compliance with the terms of the license.
