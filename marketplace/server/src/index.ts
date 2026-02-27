import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { authRouter } from './routes/auth';
import { listingsRouter } from './routes/listings';
import { messagesRouter } from './routes/messages';
import { usersRouter } from './routes/users';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/users', usersRouter);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
