import * as dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/auth';
import callbackRoutes from './routes/callback';


dotenv.config();

const app = express();

app.use('/auth', authRoutes);
app.use('/callback', callbackRoutes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
