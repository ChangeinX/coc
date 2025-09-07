export type AuthStackParamList = {
  Login: undefined;
  Banned: undefined;
};

export type MessagesStackParamList = {
  MessagesHome: undefined;
  MessageDetail: { id: string };
};

export type AppTabsParamList = {
  Dashboard: undefined;
  Messages: undefined;
  Scout: undefined;
  Stats: undefined;
  Settings: undefined;
};
