export type Language = "en" | "ru";

export interface LanguageOption {
  code: Language;
  // Shown on the language menu button next to the flag
  short: string;
  // Shown in the language menu, in the language itself
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  {code: "ru", short: "RU", name: "Русский", flag: "/assets/svg/flags/ru.svg"},
  {code: "en", short: "EN", name: "English", flag: "/assets/svg/flags/gb.svg"}
];

// Every text of the interface. Values may contain {name} placeholders, filled in by I18nService.translate.
const en = {
  // The page title and the description shown in search results (src/index.html holds the Russian ones too)
  "meta.title": "PiPoker — free online Planning Poker for agile teams",
  "meta.description": "Free online Planning Poker for scrum and agile teams: create a room, share the link "
    + "and estimate tasks together. No sign-up, works on a computer and on a phone.",

  "header.tagline": "Free Planning Poker for teams",
  "header.invite": "Invite",
  "header.copyInvitationLink": "Copy the invitation link",
  "header.support": "Support",
  "header.supportTitle": "Support PiPoker",
  "header.language": "Language",
  "header.theme": "Theme",
  "header.menu": "Menu",

  "form.nickname": "Nickname",
  "form.nicknamePlaceholder": "Choose your display name",
  "form.roomName": "Room Name",
  "form.roomNamePlaceholder": "Choose room display name",
  "form.deck": "Deck",
  "form.deckPlaceholder": "Deck Format: [card_value_1]; [card_value_2]; ... ; [card_value_20]",
  "form.deckHelp": "Pick a ready deck or type your own cards separated by \";\" and save them under a name: "
    + "your decks are kept in this browser. A deck holds up to 20 cards, each unique and at most 6 characters long.",
  "form.watcher": "Join as watcher",
  "form.createRoom": "Create Room",
  "form.joinRoom": "Join Room",

  "deck.presets": "Ready decks",
  "deck.mine": "My decks",
  "deck.own": "Own cards",
  "deck.fibonacci": "Fibonacci",
  "deck.storyPoints": "Story points",
  "deck.time": "Hours and days",
  "deck.tshirt": "T-shirt sizes",
  "deck.namePlaceholder": "Deck name to save it",
  "deck.save": "Save deck",
  "deck.delete": "Delete",
  "deck.deleteTitle": "Delete the deck from my decks",

  "validation.nickname": "Nickname",
  "validation.roomName": "Room name",
  "validation.deck": "Deck",
  "validation.required": "{field} is required",
  "validation.minLength": "{field} must be at least {length} characters long",
  "validation.maxLength": "{field} must be at most {length} characters long",
  "validation.tooManyCards": "The deck can contain at most {max} cards",
  "validation.cardTooLong": "Card values can be at most {length} characters long: {cards}",
  "validation.duplicateCards": "Card values must be unique: {cards}",
  "validation.nicknameTaken": "{nickname} is already in the room",

  "room.returning": "Returning to the table",
  "room.watchers": "Watchers",
  "room.voting": "Voting...",
  "room.revealCards": "Reveal Cards",
  "room.startNewVoting": "Start New Voting",
  "room.closedTitle": "The room is closed",
  "room.closedText": "Nobody did anything in the room for a long time, so it was closed and everyone left it.",
  "room.missingTitle": "This invitation is no longer valid",
  "room.missingText": "The room no longer exists: everyone has left it.",
  "room.createNew": "Create a new room",

  "history.title": "History",
  "history.close": "Close the history",
  "history.empty": "Revealed rounds will appear here.",
  "history.round": "Round {number}",
  "history.result": "Result: {card}",
  "history.split": "Votes split",

  "about.title": "What is PiPoker?",
  "about.description": "PiPoker is a free online Planning Poker for agile teams. Estimate tasks together: "
    + "everyone picks a card in secret, then all cards are revealed at once, so nobody is swayed by the others.",
  "about.howItWorks": "How it works",
  "about.step1": "Create a room and choose a deck.",
  "about.step2": "Send the invitation link to your team.",
  "about.step3": "Everyone votes, then reveal the cards and discuss the result.",
  "about.features": "Why PiPoker",
  "about.free": "Free and without registration.",
  "about.anyDevice": "Works in the browser on a computer and on a phone.",
  "about.ownDeck": "Ready decks (Fibonacci, story points, hours, T-shirt sizes) and your own saved decks.",
  "about.watchers": "Watchers follow the vote without voting."
};

export type TranslationKey = keyof typeof en;

const ru: Record<TranslationKey, string> = {
  "meta.title": "PiPoker — бесплатный Planning Poker онлайн для оценки задач",
  "meta.description": "Бесплатный Planning Poker онлайн для scrum-команд: создайте комнату, отправьте ссылку "
    + "и оценивайте задачи вместе. Без регистрации, на компьютере и телефоне.",

  "header.tagline": "Бесплатный Planning Poker для команд",
  "header.invite": "Пригласить",
  "header.copyInvitationLink": "Скопировать ссылку-приглашение",
  "header.support": "Поддержать",
  "header.supportTitle": "Поддержать PiPoker",
  "header.language": "Язык",
  "header.theme": "Тема",
  "header.menu": "Меню",

  "form.nickname": "Имя",
  "form.nicknamePlaceholder": "Как вас будут видеть другие",
  "form.roomName": "Название комнаты",
  "form.roomNamePlaceholder": "Как будет называться комната",
  "form.deck": "Колода",
  "form.deckPlaceholder": "Формат колоды: [карта_1]; [карта_2]; ... ; [карта_20]",
  "form.deckHelp": "Выберите готовую колоду или впишите свои карты через «;» и сохраните их под своим названием: "
    + "ваши колоды хранятся в этом браузере. В колоде до 20 карт, значения не повторяются и содержат не больше 6 символов.",
  "form.watcher": "Войти как наблюдатель",
  "form.createRoom": "Создать комнату",
  "form.joinRoom": "Войти в комнату",

  "deck.presets": "Готовые колоды",
  "deck.mine": "Мои колоды",
  "deck.own": "Свои карты",
  "deck.fibonacci": "Фибоначчи",
  "deck.storyPoints": "Story points",
  "deck.time": "Часы и дни",
  "deck.tshirt": "Размеры футболок",
  "deck.namePlaceholder": "Название, чтобы сохранить колоду",
  "deck.save": "Сохранить колоду",
  "deck.delete": "Удалить",
  "deck.deleteTitle": "Удалить колоду из моих колод",

  "validation.nickname": "Имя",
  "validation.roomName": "Название комнаты",
  "validation.deck": "Колода",
  "validation.required": "Заполните поле «{field}»",
  "validation.minLength": "Поле «{field}» должно содержать не меньше {length} символов",
  "validation.maxLength": "Поле «{field}» должно содержать не больше {length} символов",
  "validation.tooManyCards": "В колоде может быть не больше {max} карт",
  "validation.cardTooLong": "Значения карт должны содержать не больше {length} символов: {cards}",
  "validation.duplicateCards": "Значения карт не должны повторяться: {cards}",
  "validation.nicknameTaken": "{nickname} уже в комнате",

  "room.returning": "Возвращаем вас за стол",
  "room.watchers": "Наблюдатели",
  "room.voting": "Голосование...",
  "room.revealCards": "Открыть карты",
  "room.startNewVoting": "Новое голосование",
  "room.closedTitle": "Комната закрыта",
  "room.closedText": "В комнате долго ничего не происходило, поэтому она закрыта и все участники её покинули.",
  "room.missingTitle": "Приглашение больше не действует",
  "room.missingText": "Этой комнаты больше нет: все участники её покинули.",
  "room.createNew": "Создать новую комнату",

  "history.title": "История",
  "history.close": "Закрыть историю",
  "history.empty": "Здесь появятся раунды после того, как карты откроют.",
  "history.round": "Раунд {number}",
  "history.result": "Итог: {card}",
  "history.split": "Голоса разделились",

  "about.title": "Что такое PiPoker?",
  "about.description": "PiPoker — бесплатный онлайн Planning Poker для команд. Оценивайте задачи вместе: "
    + "каждый выбирает карту втайне, затем все карты открываются одновременно, и никто не подстраивается под других.",
  "about.howItWorks": "Как это работает",
  "about.step1": "Создайте комнату и выберите колоду.",
  "about.step2": "Отправьте команде ссылку-приглашение.",
  "about.step3": "Все голосуют, затем вы открываете карты и обсуждаете результат.",
  "about.features": "Почему PiPoker",
  "about.free": "Бесплатно и без регистрации.",
  "about.anyDevice": "Работает в браузере на компьютере и на телефоне.",
  "about.ownDeck": "Готовые колоды (Фибоначчи, story points, часы, размеры футболок) и свои сохранённые колоды.",
  "about.watchers": "Наблюдатели следят за голосованием, не голосуя."
};

export const translations: Record<Language, Record<TranslationKey, string>> = {en, ru};
