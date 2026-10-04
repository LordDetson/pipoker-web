# PiPoker Web App

**Try it: [pipoker.duckdns.org](https://pipoker.duckdns.org)** — free online Planning Poker, no sign-up.

PiPoker is a powerful web application built with Angular that utilizes the [PiPoker API](https://github.com/LordDetson/pipoker-api). It provides a user-friendly interface for teams to engage in collaborative estimation using the Planning Poker technique. With PiPoker, you can streamline your agile planning process and enhance team collaboration.

## About PiPoker
PiPoker is a comprehensive web application designed to facilitate the estimation of user stories, tasks, or any other work items using Planning Poker. It combines the power of Angular with the [PiPoker API](https://github.com/LordDetson/pipoker-api) to create an intuitive and efficient estimation tool for agile teams.

## Key Features
**Interactive Interface:** PiPoker Web Application offers a visually appealing and interactive interface that engages team members in the estimation process. It provides a smooth and enjoyable user experience.

**Real-Time Updates:** With PiPoker's real-time updates, team members can see the estimated values provided by others in real-time. This ensures transparency and allows for effective decision-making during the planning process.

**Customizable Estimation Deck:** PiPoker allows teams to customize the estimation deck to match their specific needs.

**Private Rooms:** PiPoker introduces a feature that allows users to create private rooms for their teams. These private rooms provide a dedicated space where team members can collaborate and engage in the estimation process with ease and confidentiality.

## Tests
Run the tests with `npx ng test --watch=false --code-coverage` (add `--browsers=ChromeHeadlessCI` where there is no display).
The coverage report is written to `coverage/pipoker-web`.

- Unit tests sit next to the code they test: services, NgRx reducers, selectors and effects, and every component.
- Integration tests in `src/app/integration` run the whole client (components, store, effects and services)
  against an in-memory imitation of the pipoker-app STOMP API from `src/app/testing/fake-stomp.ts`.
  Only the STOMP connection is replaced, so no backend is needed.

## Contributing
We welcome contributions from the community to enhance PiPoker Web Application. If you have any ideas, bug reports, or feature requests, please feel free to submit them in the Issues section of our GitHub repository. We appreciate your support in making PiPoker even better.

## License
PiPoker API is released under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt). You are free to use, modify, and distribute this software in compliance with the terms of the license.
