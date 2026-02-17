/**
 * @fileoverview Express application setup with routes, middleware, monitoring, and error handling.
 * Configures session management, security policies, API routes, and global error handling.
 * @module app
 */

import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import morgan from 'morgan';
import MongoStore from "connect-mongo";

import { checkRole } from './middleware/checkRole.js';
import { auth } from './middleware/authMiddleware.js';
import { validateOrigin } from './middleware/validateOrigin.js';
import { smartOriginValidator } from './middleware/smartOriginValidator.js';
import { codeRouter } from './routes/codeRoutes.js';

import { lintRouter } from './routes/lintRoutes.js';
import { assistantRouter } from './routes/assistantRoutes.js';
import { projectFilesRouter } from './routes/projectFilesRoutes.js';
import { taskRouter } from './routes/taskRoutes.js';
import { projectRouter } from './routes/projectRoutes.js';

import { userRouter } from './routes/userRoutes.js';
import { roleRouter } from './routes/roleRoutes.js';
import { userProfileRouter } from './routes/userProfileRoutes.js';
import { avatarRouter } from './routes/avatarRoutes.js';
import { securityMiddleware } from './security.js';

import { globalErrorHandler } from './middleware/errorHandlers.js';
import { registerRouter } from './routes/registerRoutes.js';

dotenv.config();

const app = express();

/**
 * Session middleware configuration.
 * Requires SESSION_SECRET to be defined in environment variables.
 */
if (!process.env.SESSION_SECRET) {
  throw new Error("❌ SESSION_SECRET environment variable is not defined. Please set it in your .env file.");
}

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
};

if (process.env.NODE_ENV === "production") {
  sessionConfig.store = MongoStore.create({ mongoUrl: process.env.MONGO_URI });
}

app.use(session(sessionConfig));


/**
 * Security middleware (CORS, CSP, etc.)
 */
try {
  securityMiddleware(app);
} catch (err) {
  console.error('🔥 Error in securityMiddleware:', err);
}

/**
 * Core middleware
 */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

/**
 * Origin validation middleware
 */
app.use(smartOriginValidator);

/**
 * Public routes
 */
app.get('/', (req, res) => {
  res.send('Welcome to the secure and monitored platform.');
});

app.get('/api', (req, res) => {
  res.json({ message: 'pong from Express backend 🚀' });
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

/**
 * Protected route example
 */
app.get('/admin-only', validateOrigin, auth, checkRole(['admin']), (req, res, next) => {
  try {
    res.json({ message: `Hi ${req.user.username}, you have admin access 🔑` });
  } catch (err) {
    next(err);
  }
});

/**
 * Global authentication middleware for all /api routes
 */
app.use('/api', auth);

/**
 * API routes
 */
app.use('/api', registerRouter); 
app.use('/api', userProfileRouter);
app.use('/api/code', codeRouter);
app.use('/api', lintRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/project-files', projectFilesRouter);
app.use('/api', taskRouter);
app.use('/api', projectRouter);
app.use('/api/users', userRouter);
app.use('/api', roleRouter);
app.use('/api/avatars', avatarRouter);

app.use('/docs', (req, res) => {
res.redirect('https://arispretz-codeuniverse-ai_assistant.hf.space/docs');
});
app.use('/openapi.json', (req, res) => {
res.redirect('https://arispretz-codeuniverse-ai_assistant.hf.space/openapi.json');
});

/**
 * Catch-all for unmatched /api routes
 */
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route /api not found" });
});

/**
 * Global catch-all for unmatched routes
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Final global error handler
 */
app.use(globalErrorHandler);

export { app };
