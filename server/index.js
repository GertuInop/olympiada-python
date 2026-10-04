import dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server started on all addresses: http://localhost:${PORT}`);
});
