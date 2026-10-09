import {Language} from "../i18n/translations";

// The guide "How to run Planning Poker" (/guide), in both languages. It is structured text rather than
// translation keys: each step carries its own paragraphs, the way it is done in PiPoker and a screenshot.

export interface GuideImage {
  // Under /assets/guide/<language>/
  file: string;
  alt: string;
  // A phone screenshot stands narrow beside the text instead of spanning it
  phone?: boolean;
}

export interface GuideStep {
  title: string;
  text: string[];
  inPiPoker: string[];
  image?: GuideImage;
}

export interface GuideDeck {
  name: string;
  cards: string;
  when: string;
}

export interface GuideMistake {
  title: string;
  text: string;
}

export interface GuideContent {
  // The <title> and the meta description of the page
  title: string;
  description: string;
  heading: string;
  lead: string;
  what: {title: string; text: string[]};
  why: {title: string; items: string[]};
  decks: {title: string; intro: string; items: GuideDeck[]; ownDeck: string};
  steps: {title: string; intro: string; inPiPoker: string; items: GuideStep[]};
  mistakes: {title: string; items: GuideMistake[]};
  tryIt: {title: string; text: string; button: string};
}

const en: GuideContent = {
  title: "How to run Planning Poker: a step-by-step guide | PiPoker",
  description: "What Planning Poker is, which deck to pick, how the estimation meeting goes step by step and which "
    + "mistakes to avoid. Each step shows how it is done in PiPoker, a free online Planning Poker.",
  heading: "How to run Planning Poker",
  lead: "What Planning Poker is, which deck to pick, how the meeting goes and which mistakes to avoid. "
    + "Each step shows how it is done in PiPoker.",
  what: {
    title: "What Planning Poker is",
    text: [
      "Planning Poker (also called Scrum Poker) is a way for the whole team to estimate tasks together. Everyone "
      + "picks a card with an estimate in secret, then all cards are revealed at once. When the estimates match, the "
      + "task is estimated. When they differ, the team discusses why and votes again.",
      "The game was described by James Grenning in 2002 and made popular by Mike Cohn. The estimate is usually "
      + "relative, in story points or sizes, not in hours: the point is a shared understanding of the task, not an "
      + "exact number."
    ]
  },
  why: {
    title: "Why it works",
    items: [
      "A secret vote removes anchoring: nobody adjusts their estimate to the team lead or the most confident colleague.",
      "Different estimates are the best reason to ask a question. The person who put 13 against everyone's 3 often "
      + "knows a risk the others have not thought of.",
      "The people who will do the work estimate it, so the estimate is more accurate and the team stands behind it.",
      "The talk is bounded: cards, a short discussion, the next task. The meeting does not turn into a design session."
    ]
  },
  decks: {
    title: "Which deck to pick",
    intro: "The deck is the set of cards everyone chooses from. The gaps between the cards grow with the estimate on "
      + "purpose: a big task cannot be estimated as precisely as a small one, so there is no card between 20 and 40.",
    items: [
      {
        name: "Fibonacci",
        cards: "0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89",
        when: "The classic deck for story points. A task above 13 is usually a sign to split it."
      },
      {
        name: "Story points",
        cards: "0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100",
        when: "The rounded variant popularised by Mike Cohn: ½ for trivial changes, 20, 40 and 100 for epics that "
          + "still need breaking down."
      },
      {
        name: "Hours and days",
        cards: "NA, 1h … 4h, 1d … 4d, 1w … 3w",
        when: "When the team estimates in time: support work, fixed-price contracts or a plan for the week."
      },
      {
        name: "T-shirt sizes",
        cards: "XS, S, M, L, XL, XXL",
        when: "A rough sizing of a backlog or epics, when numbers would suggest a precision nobody has."
      }
    ],
    ownDeck: "Every deck has a ? card for \"I can't estimate this yet\" and most have a ☕ card for \"I need a break\". "
      + "In PiPoker you can also type your own cards separated by \";\" and save the deck under a name in your browser."
  },
  steps: {
    title: "The meeting, step by step",
    intro: "An estimation meeting takes from a few minutes to an hour, depending on how many tasks there are. "
      + "The steps below repeat for every task.",
    inPiPoker: "In PiPoker",
    items: [
      {
        title: "Prepare the tasks and open a room",
        text: [
          "Before the meeting, the product owner prepares the list of tasks to estimate: each with a short "
          + "description and what \"done\" means for it. Put the tasks in the order you want to estimate them, and "
          + "estimate a few small, well-understood ones first: they become the reference for the rest.",
          "Agree on the deck and on what the estimate means (story points, days) before the first vote, not during it."
        ],
        inPiPoker: [
          "Type your nickname and the name of the meeting, for example \"Sprint 12\", pick a deck and press "
          + "\"Create Room\". No sign-up, the room is ready in a second.",
          "The decks are Fibonacci, story points, hours and days, T-shirt sizes or your own cards."
        ],
        image: {file: "create.webp", alt: "The PiPoker start page with a room name and the Fibonacci deck chosen"}
      },
      {
        title: "Invite the team and settle the roles",
        text: [
          "Those who will do the work vote: developers, testers, designers. The product owner, the scrum master and "
          + "stakeholders are better off watching: they answer questions and hear the discussion, but their card "
          + "would only anchor the team.",
          "Everyone should be at the table before the first vote; an estimate made without the person who will do "
          + "the task is a guess."
        ],
        inPiPoker: [
          "Press \"Invite\": the invitation link is copied. Send it to the team in a chat; a colleague opens it, "
          + "types a name and is at the table, on a laptop or a phone.",
          "A person who should follow without voting switches on \"Watcher\" in the room or joins as a watcher. "
          + "The role can be changed at any moment."
        ],
        image: {file: "voting.webp", alt: "A PiPoker room with six voters and two watchers during a vote"}
      },
      {
        title: "Present the task",
        text: [
          "The product owner reads the task and answers questions: what exactly has to be done, what is out of "
          + "scope, what it depends on. Two or three minutes are enough; if the questions do not end, the task is "
          + "not ready and goes back to refinement.",
          "Do not discuss how to do it yet: that comes after the cards are revealed, and only if the estimates differ."
        ],
        inPiPoker: [
          "Type the task name above the table and, if you like, paste a link to the task in the tracker. Everyone "
          + "in the room sees them and the link opens in a new tab.",
          "The name and the link go into the history and the meeting summary with the estimate."
        ]
      },
      {
        title: "Vote in secret",
        text: [
          "Everyone picks the card that matches their own feeling of the task size, without saying it out loud and "
          + "without looking at the others. Not sure? Pick ? and say what you would need to know.",
          "Compare the task with the reference tasks estimated earlier: \"is it bigger than the login form we gave "
          + "a 3?\" is easier than guessing an absolute number."
        ],
        inPiPoker: [
          "The deck is under the table. Pick a card; the others see only that your card is laid, not which one. "
          + "You can change your mind until the cards are revealed.",
          "The cards are revealed automatically when the last voter has picked. The host can also reveal them "
          + "earlier with \"Reveal Cards\", for example when someone is away."
        ],
        image: {file: "phone.webp", alt: "The same PiPoker room on a phone during a vote", phone: true}
      },
      {
        title: "Reveal the cards and discuss the differences",
        text: [
          "When the cards match or differ by one step, the estimate is accepted. When they differ more, the owners "
          + "of the lowest and the highest cards explain their reasoning first, then the others join in. Usually one "
          + "side knows something the other does not: an existing library, an unclear requirement, a hidden "
          + "dependency.",
          "Then vote again. Two or three rounds are enough; if the spread stays after that, the task is not "
          + "understood well enough and should be split or clarified rather than estimated."
        ],
        inPiPoker: [
          "The revealed cards gather into piles by value, and the result shows the most popular estimate, how many "
          + "chose it, the team's agreement in percent and the spread.",
          "\"Start New Voting\" clears the table for the next round of the same task, while the task name stays."
        ],
        image: {file: "revealed.webp", alt: "Revealed cards in PiPoker: 5, 8 and 5, estimate 5 accepted"}
      },
      {
        title: "Accept the estimate and move on",
        text: [
          "Record the agreed estimate against the task and take the next one. Keep the pace: a task that needs "
          + "more than ten minutes is a candidate for splitting, not for a longer discussion.",
          "After the meeting, put the estimates into the tracker and keep the list of reference tasks for the next "
          + "time."
        ],
        inPiPoker: [
          "Press \"Accept 5\" (or choose another card as the estimate). Each revealed round goes into the room's "
          + "history: the task, who picked what and the accepted estimate.",
          "\"Copy summary\" puts the whole meeting into text for a chat or a ticket, and the history can be exported "
          + "to Excel, CSV, text or XML. The discussion timer in the room keeps the talk within the agreed minutes."
        ],
        image: {file: "history.webp", alt: "The history panel in PiPoker with a round and the Copy summary button"}
      }
    ]
  },
  mistakes: {
    title: "Common mistakes",
    items: [
      {
        title: "Averaging the estimates",
        text: "3 and 13 do not make 8. A spread means the task is understood differently; discuss the difference "
          + "instead of adding the numbers up."
      },
      {
        title: "Saying an estimate out loud before the reveal",
        text: "\"I think it's a 5\" from the team lead anchors everyone. The cards are revealed together for a reason."
      },
      {
        title: "Converting story points to hours",
        text: "Once a point equals four hours, people estimate hours again and the relative scale loses its sense. "
          + "If you need time, pick the hours and days deck and say so."
      },
      {
        title: "Discussing a task for half an hour",
        text: "A long discussion means the task is not ready. Set a timer, and when it runs out, send the task "
          + "back to refinement or split it."
      },
      {
        title: "Estimating epics",
        text: "A card above 13 or 20 is not an estimate but a signal to split. Big tasks are estimated roughly, so "
          + "their numbers are not comparable with the small ones."
      },
      {
        title: "Letting managers vote",
        text: "The product owner and the stakeholders know what is needed, not how long it takes. Their place is "
          + "among the watchers, with the right to answer questions."
      },
      {
        title: "Negotiating the estimate down to fit the plan",
        text: "An estimate changed under pressure is still the old estimate, the deadline just got more "
          + "optimistic. Change the scope or the plan, not the number."
      }
    ]
  },
  tryIt: {
    title: "Try it at your next planning",
    text: "A room in PiPoker is ready in a minute, with no sign-up, on a computer and on a phone.",
    button: "Create a room"
  }
};

const ru: GuideContent = {
  title: "Как провести Planning Poker: руководство по шагам | PiPoker",
  description: "Что такое Planning Poker (покер планирования), какую колоду выбрать, как проходит встреча по шагам и "
    + "каких ошибок избегать. В каждом шаге показано, как это делается в PiPoker, бесплатном Planning Poker онлайн.",
  heading: "Как провести Planning Poker",
  lead: "Что такое Planning Poker, какую колоду выбрать, как проходит встреча и каких ошибок избегать. "
    + "В каждом шаге показано, как это делается в PiPoker.",
  what: {
    title: "Что такое Planning Poker",
    text: [
      "Planning Poker (покер планирования, scrum poker) — способ оценивать задачи всей командой. Каждый участник "
      + "втайне выбирает карту с оценкой, затем все карты открываются одновременно. Если оценки совпали, задача "
      + "оценена. Если разошлись, команда обсуждает, почему, и голосует снова.",
      "Метод описал Джеймс Греннинг в 2002 году, а популярным его сделал Майк Кон. Оценка обычно относительная, в "
      + "story points или размерах, а не в часах: важна не точная цифра, а общее понимание задачи."
    ]
  },
  why: {
    title: "Почему это работает",
    items: [
      "Тайное голосование убирает эффект якоря: никто не подстраивается под тимлида или самого уверенного коллегу.",
      "Расхождение оценок — лучший повод для вопроса. Тот, кто поставил 13 против общих 3, часто знает о риске, "
      + "о котором остальные не подумали.",
      "Оценивают те, кто будет делать работу, поэтому оценка точнее, а команда с ней согласна.",
      "Разговор ограничен: карты, короткое обсуждение, следующая задача. Встреча не превращается в проектирование."
    ]
  },
  decks: {
    title: "Какую колоду выбрать",
    intro: "Колода — набор карт, из которых все выбирают. Промежутки между картами растут вместе с оценкой "
      + "нарочно: большую задачу нельзя оценить так же точно, как маленькую, поэтому карты между 20 и 40 нет.",
    items: [
      {
        name: "Фибоначчи",
        cards: "0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89",
        when: "Классическая колода для story points. Задача больше 13 — обычно знак, что её пора разбить."
      },
      {
        name: "Story points",
        cards: "0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100",
        when: "Округлённый вариант, который популяризировал Майк Кон: ½ для мелочей, 20, 40 и 100 для эпиков, "
          + "которые ещё предстоит разбить."
      },
      {
        name: "Часы и дни",
        cards: "NA, 1h … 4h, 1d … 4d, 1w … 3w",
        when: "Когда команда оценивает во времени: поддержка, работа по фиксированной цене или план на неделю."
      },
      {
        name: "Размеры футболок",
        cards: "XS, S, M, L, XL, XXL",
        when: "Грубая оценка бэклога или эпиков, когда цифры создавали бы видимость точности, которой нет."
      }
    ],
    ownDeck: "В каждой колоде есть карта ? для «пока не могу оценить», а в большинстве — ☕ для «нужен перерыв». "
      + "В PiPoker можно также ввести свои карты через «;» и сохранить колоду под именем в своём браузере."
  },
  steps: {
    title: "Встреча по шагам",
    intro: "Встреча по оценке занимает от нескольких минут до часа, смотря сколько задач. Шаги ниже повторяются "
      + "для каждой задачи.",
    inPiPoker: "В PiPoker",
    items: [
      {
        title: "Подготовьте задачи и откройте комнату",
        text: [
          "До встречи владелец продукта готовит список задач на оценку: у каждой короткое описание и что для неё "
          + "значит «сделано». Расположите задачи в том порядке, в каком будете оценивать, и начните с нескольких "
          + "маленьких и понятных: они станут эталоном для остальных.",
          "О колоде и о том, что значит оценка (story points, дни), договоритесь до первого голосования, а не во "
          + "время него."
        ],
        inPiPoker: [
          "Введите своё имя и название встречи, например «Спринт 12», выберите колоду и нажмите «Создать комнату». "
          + "Без регистрации, комната готова за секунду.",
          "Колоды: Фибоначчи, story points, часы и дни, размеры футболок или свои карты."
        ],
        image: {file: "create.webp", alt: "Главная страница PiPoker с названием комнаты и выбранной колодой Фибоначчи"}
      },
      {
        title: "Пригласите команду и распределите роли",
        text: [
          "Голосуют те, кто будет делать работу: разработчики, тестировщики, дизайнеры. Владельцу продукта, скрам-"
          + "мастеру и заказчикам лучше наблюдать: они отвечают на вопросы и слышат обсуждение, но их карта только "
          + "сбивала бы команду.",
          "Все должны быть за столом до первого голосования: оценка без того, кто будет делать задачу, — это "
          + "гадание."
        ],
        inPiPoker: [
          "Нажмите «Пригласить»: ссылка-приглашение скопирована. Отправьте её команде в чат; коллега открывает её, "
          + "вводит имя и оказывается за столом, с ноутбука или телефона.",
          "Тот, кто должен следить, не голосуя, включает в комнате переключатель «Наблюдатель» или входит как "
          + "наблюдатель. Роль можно поменять в любой момент."
        ],
        image: {file: "voting.webp", alt: "Комната PiPoker с шестью голосующими и двумя наблюдателями во время голосования"}
      },
      {
        title: "Представьте задачу",
        text: [
          "Владелец продукта читает задачу и отвечает на вопросы: что именно нужно сделать, что не входит, от чего "
          + "зависит. Двух-трёх минут достаточно; если вопросы не кончаются, задача не готова и возвращается на "
          + "проработку.",
          "Как делать, пока не обсуждайте: это после открытия карт, и только если оценки разошлись."
        ],
        inPiPoker: [
          "Впишите название задачи над столом и, если хотите, вставьте ссылку на задачу в трекере. Их видят все в "
          + "комнате, ссылка открывается в новой вкладке.",
          "Название и ссылка попадают в историю и в итоги встречи вместе с оценкой."
        ]
      },
      {
        title: "Голосуйте втайне",
        text: [
          "Каждый выбирает карту, которая соответствует его собственному ощущению размера задачи, не называя её "
          + "вслух и не глядя на других. Не уверены? Выберите ? и скажите, чего не хватает, чтобы оценить.",
          "Сравнивайте задачу с эталонными, оценёнными раньше: «это больше формы входа, которой мы дали 3?» проще, "
          + "чем угадывать абсолютное число."
        ],
        inPiPoker: [
          "Колода под столом. Выберите карту; остальные видят только, что карта положена, но не какая. Передумать "
          + "можно, пока карты не открыты.",
          "Карты открываются сами, когда выбрал последний голосующий. Ведущий может открыть их и раньше кнопкой "
          + "«Открыть карты», например если кто-то отошёл."
        ],
        image: {file: "phone.webp", alt: "Та же комната PiPoker на телефоне во время голосования", phone: true}
      },
      {
        title: "Откройте карты и обсудите расхождения",
        text: [
          "Если карты совпали или отличаются на один шаг, оценка принята. Если разошлись сильнее, сначала объясняют "
          + "свои доводы владельцы самой низкой и самой высокой карты, потом подключаются остальные. Обычно одна "
          + "сторона знает то, чего не знает другая: готовую библиотеку, неясное требование, скрытую зависимость.",
          "Затем голосуйте снова. Двух-трёх раундов достаточно; если разброс остаётся и после них, задача понята "
          + "недостаточно, и её надо разбить или уточнить, а не оценивать."
        ],
        inPiPoker: [
          "Открытые карты собираются в стопки по значениям, а итог показывает самую частую оценку, сколько человек "
          + "её выбрали, согласие команды в процентах и разброс.",
          "«Новое голосование» очищает стол для следующего раунда по той же задаче, название задачи остаётся."
        ],
        image: {file: "revealed.webp", alt: "Открытые карты в PiPoker: 5, 8 и 5, принята оценка 5"}
      },
      {
        title: "Примите оценку и переходите дальше",
        text: [
          "Запишите согласованную оценку в задачу и берите следующую. Держите темп: задача, которой нужно больше "
          + "десяти минут, — кандидат на разбиение, а не на долгое обсуждение.",
          "После встречи перенесите оценки в трекер и сохраните список эталонных задач до следующего раза."
        ],
        inPiPoker: [
          "Нажмите «Принять 5» (или выберите другую карту как оценку). Каждый открытый раунд попадает в историю "
          + "комнаты: задача, кто что поставил и принятая оценка.",
          "«Скопировать итоги» собирает всю встречу в текст для чата или задачи, а историю можно выгрузить в Excel, "
          + "CSV, текст или XML. Таймер обсуждения в комнате удерживает разговор в согласованных минутах."
        ],
        image: {file: "history.webp", alt: "Панель истории в PiPoker с раундом и кнопкой «Скопировать итоги»"}
      }
    ]
  },
  mistakes: {
    title: "Частые ошибки",
    items: [
      {
        title: "Усреднять оценки",
        text: "3 и 13 не дают 8. Разброс значит, что задачу понимают по-разному; обсудите разницу, а не складывайте "
          + "числа."
      },
      {
        title: "Называть оценку вслух до открытия карт",
        text: "«По-моему, тут 5» от тимлида становится якорем для всех. Карты открываются одновременно не просто так."
      },
      {
        title: "Переводить story points в часы",
        text: "Как только пункт равен четырём часам, люди снова оценивают часы, и относительная шкала теряет смысл. "
          + "Нужно время — возьмите колоду «Часы и дни» и скажите об этом."
      },
      {
        title: "Обсуждать задачу полчаса",
        text: "Долгое обсуждение значит, что задача не готова. Поставьте таймер, а когда он истечёт, верните задачу "
          + "на проработку или разбейте."
      },
      {
        title: "Оценивать эпики",
        text: "Карта больше 13 или 20 — не оценка, а сигнал разбить задачу. Большие задачи оцениваются грубо, и их "
          + "числа несравнимы с маленькими."
      },
      {
        title: "Давать голосовать менеджерам",
        text: "Владелец продукта и заказчики знают, что нужно, а не сколько это займёт. Их место среди наблюдателей, "
          + "с правом отвечать на вопросы."
      },
      {
        title: "Торговаться об оценке, чтобы попасть в план",
        text: "Оценка, изменённая под давлением, остаётся прежней, просто срок стал оптимистичнее. Меняйте объём или "
          + "план, а не число."
      }
    ]
  },
  tryIt: {
    title: "Попробуйте на следующем планировании",
    text: "Комната в PiPoker готова за минуту, без регистрации, на компьютере и телефоне.",
    button: "Создать комнату"
  }
};

export const GUIDE: Record<Language, GuideContent> = {en, ru};
