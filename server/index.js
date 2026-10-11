import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import olympiadRoutes from './routes/olympiads.js';
import taskRoutes from './routes/tasks.js';
import submissionRoutes from './routes/submissions.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const clientDist =
  process.env.CLIENT_DIST ||
  path.join(__dirname, 'public');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ message: 'Python Olympiad API', version: '1.0.0', ok: true });
});

app.use('/auth', authRoutes);
app.use('/olympiads', olympiadRoutes);
app.use('/tasks', taskRoutes);
app.use('/submissions', submissionRoutes);
app.use('/admin', adminRoutes);

const hasClient = fs.existsSync(path.join(clientDist, 'index.html'));

if (hasClient) {
  app.use(express.static(clientDist, { index: false }));
  // SPA fallback (API-роуты выше уже обработаны)
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'Python Olympiad API', version: '1.0.0' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started: http://0.0.0.0:${PORT}`);
  if (hasClient) console.log(`Serving client from ${clientDist}`);
});
