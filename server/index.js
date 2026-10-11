import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import olympiadRoutes from './routes/olympiads.js';
import taskRoutes from './routes/tasks.js';
import submissionRoutes from './routes/submissions.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'Python Olympiad API', version: '1.0.0' });
});

app.use('/auth', authRoutes);
app.use('/olympiads', olympiadRoutes);
app.use('/tasks', taskRoutes);
app.use('/submissions', submissionRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
