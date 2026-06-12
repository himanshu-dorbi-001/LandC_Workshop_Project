import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { adminRoutes } from './routes/admin.routes';
import { managerRoutes } from './routes/manager.routes';
import { resourceRoutes } from './routes/employee.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/manager',  managerRoutes);
app.use('/api/resource', resourceRoutes);

app.use(errorHandler);

export default app;
