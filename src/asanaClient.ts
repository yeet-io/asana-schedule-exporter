import { Client } from 'asana';

export default () => Client.create({
    clientId: process.env.ASANA_CLIENT_ID,
    clientSecret: process.env.ASANA_CLIENT_SECRET,
    redirectUri: process.env.ASANA_REDIRECT_URI,
    defaultHeaders: {
      'Asana-Disable': 'new_goal_memberships',
    },
  });