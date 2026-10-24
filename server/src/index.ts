import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { migrate } from './db/migrate.js';
import { gatewayRouter } from './routes/gateway.js';
import { charitiesRouter } from './routes/charities.js';
import { commitmentsRouter, checkExpiredCommitments } from './routes/commitments.js';
import { forestRouter } from './routes/forest.js';
import { vaultsRouter } from './routes/vaults.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize SQLite database schema & seeds on startup
try {
  migrate();
  checkExpiredCommitments();
  console.log('[bet-me-to-it] Database migrations completed.');
} catch (err) {
  console.error('[bet-me-to-it] Failed to run database migrations:', err);
}

// Background timer to check for expired commitments every 60 seconds
setInterval(() => {
  const expiredCount = checkExpiredCommitments();
  if (expiredCount > 0) {
    console.log(`[bet-me-to-it] Auto-expired ${expiredCount} overdue task commitment(s).`);
  }
}, 60 * 1000);

// Mount routes
app.use('/api/gateway', gatewayRouter);
app.use('/api/charities', charitiesRouter);
app.use('/api/commitments', commitmentsRouter);
app.use('/api/challenges', commitmentsRouter); // alias for challenge endpoints
app.use('/api/forest', forestRouter);
app.use('/api/vaults', vaultsRouter);

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
