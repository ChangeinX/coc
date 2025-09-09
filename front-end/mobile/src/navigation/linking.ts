import type { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
  prefixes: ['clanboards://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Banned: 'banned',
        },
      },
      App: {
        screens: {
          Dashboard: {
            path: 'dashboard',
            screens: {
              DashboardHome: '',
              ClanView: 'clan/:clanTag',
              MemberView: 'member/:playerTag',
            },
          },
          Messages: {
            screens: {
              MessagesHome: 'messages',
              MessageDetail: 'messages/:id',
            },
          },
          Scout: 'scout',
          Stats: 'stats', 
          Settings: 'settings',
        },
      },
    },
  },
};
