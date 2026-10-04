export type Language = "en" | "ru";

// Every text of the interface. Values may contain {name} placeholders, filled in by I18nService.translate.
const en = {
  "header.tagline": "Free Planning Poker for teams",
  "header.copyInvitationLink": "Copy Invitation Link",
  "header.support": "Support",
  "header.supportTitle": "Support PiPoker",
  "header.switchLanguage": "Русский",

  "form.nickname": "Nickname",
  "form.nicknamePlaceholder": "Choose your display name",
  "form.roomName": "Room Name",
  "form.roomNamePlaceholder": "Choose room display name",
  "form.deck": "Deck",
  "form.deckPlaceholder": "Deck Format: [card_value_1]; [card_value_2]; ... ; [card_value_20]",
  "form.deckHelp": "Deck is a set of cards that participants can choose during a vote. "
    + "The deck contains no more than 20 cards. Card values must be unique and no more than 6 characters. "
    + "Deck Format: [card_value_1]; [card_value_2]; ... ; [card_value_20]",
  "form.watcher": "Join as watcher",
  "form.createRoom": "Create Room",
  "form.joinRoom": "Join Room",

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
  "room.voting": "Voting...",
  "room.revealCards": "Reveal Cards",
  "room.startNewVoting": "Start New Voting",

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
  "about.ownDeck": "Your own deck: hours, days, story points or T-shirt sizes.",
  "about.watchers": "Watchers follow the vote without voting."
};

export type TranslationKey = keyof typeof en;

const ru: Record<TranslationKey, string> = {
  "header.tagline": "Бесплатный Planning Poker для команд",
  "header.copyInvitationLink": "Скопировать приглашение",
  "header.support": "Поддержать",
  "header.supportTitle": "Поддержать PiPoker",
  "header.switchLanguage": "English",

  "form.nickname": "Имя",
  "form.nicknamePlaceholder": "Как вас будут видеть другие",
  "form.roomName": "Название комнаты",
  "form.roomNamePlaceholder": "Как будет называться комната",
  "form.deck": "Колода",
  "form.deckPlaceholder": "Формат колоды: [карта_1]; [карта_2]; ... ; [карта_20]",
  "form.deckHelp": "Колода — это карты, из которых участники выбирают оценку при голосовании. "
    + "В колоде не больше 20 карт. Значения карт не повторяются и содержат не больше 6 символов. "
    + "Формат колоды: [карта_1]; [карта_2]; ... ; [карта_20]",
  "form.watcher": "Войти как наблюдатель",
  "form.createRoom": "Создать комнату",
  "form.joinRoom": "Войти в комнату",

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
  "room.voting": "Голосование...",
  "room.revealCards": "Открыть карты",
  "room.startNewVoting": "Новое голосование",

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
  "about.ownDeck": "Своя колода: часы, дни, story points или размеры футболок.",
  "about.watchers": "Наблюдатели следят за голосованием, не голосуя."
};

export const translations: Record<Language, Record<TranslationKey, string>> = {en, ru};
