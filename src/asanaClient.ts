import { Client } from 'asana';

export default () => Client.create({
    clientId: process.env.ASANA_CLIENT_ID,
    clientSecret: process.env.ASANA_CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/callback',
    defaultHeaders: {
      'Asana-Disable': 'new_goal_memberships',
    },
  });