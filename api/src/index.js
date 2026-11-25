import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { ensureBuckets } from './services/storage.service.js';
import { getRedisClient } from './services/queue.service.js';

import authRoutes from './routes/auth.routes.js';
import filesRoutes from './routes/files.routes.js';
import foldersRoutes from './routes/folders.routes.js';
import trashRoutes from './routes/trash.routes.js';
import sharesRoutes from './routes/shares.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'drive-mini-api',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/me', userRoutes);
app.use('/api', sharesRoutes);

// Direct /s/:token public access redirect or routing
app.use('/', sharesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
});

// Start Server
async function start() {
  try {
    console.log('🚀 Starting Drive Mini API...');
    
    // 1. Initialize PostgreSQL
    await initDb();

    // 2. Ensure MinIO buckets exist
    try {
      await ensureBuckets();
    } catch (minioErr) {
      console.warn('[MinIO] Ensure buckets warning:', minioErr.message);
    }

    // 3. Connect Redis
    try {
      getRedisClient();
    } catch (redisErr) {
      console.warn('[Redis] Init warning:', redisErr.message);
    }

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`✅ Drive Mini API listening on port ${config.port}`);
      console.log(`   - Environment: ${config.nodeEnv}`);
      console.log(`   - Public MinIO URL: ${config.minio.publicUrl}`);
    });
  } catch (err) {
    console.error('❌ Failed to start API server:', err);
    process.exit(1);
  }
}

start();

