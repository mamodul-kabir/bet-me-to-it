import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { migrate } from './db/migrate.js';
import { gatewayRouter } from './routes/gateway.js';
import { charitiesRouter } from './routes/charities.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Initialize SQLite database schema & seeds on startup
try {
  migrate();
  console.log('[bet-me-to-it] Database migrations completed.');
} catch (err) {
  console.error('[bet-me-to-it] Failed to run database migrations:', err);
}

// Mount routes
app.use('/api/gateway', gatewayRouter);
app.use('/api/charities', charitiesRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bet-me-to-it-server',
    timestamp: new Date().toISOString(),
  });
});

// Start listener only when run directly (not imported as a test module)
if (!process.env.TEST_MODE) {
  app.listen(config.port, () => {
    console.log(`[bet-me-to-it] Server listening on http://localhost:${config.port}`);
  });
}

export default app;
