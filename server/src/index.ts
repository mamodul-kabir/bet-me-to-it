import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bet-me-to-it-server',
    timestamp: new Date().toISOString(),
  });
});

app.listen(config.port, () => {
  console.log(`[bet-me-to-it] Server listening on http://localhost:${config.port}`);
});

export default app;

