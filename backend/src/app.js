import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

// ─── Security ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? true
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// ─── Parsing ─────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static Files ────────────────────────────
app.use('/invoices', express.static('invoices'));

// ─── API Routes ──────────────────────────────
app.use('/api/v1', routes);

// ─── 404 Handler ─────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found' },
  });
});

// ─── Global Error Handler ────────────────────
app.use(errorMiddleware);

export default app;
