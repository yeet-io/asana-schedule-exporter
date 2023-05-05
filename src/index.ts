import * as dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/auth';
import callbackRoutes from './routes/callback';


dotenv.config();

const app = express();

app.use('/auth', authRoutes);
app.use('/callback', callbackRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
