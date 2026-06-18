import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/api';
import sequelize from './config/database';
import './models';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    try {
      await sequelize.sync({ alter: true });
    } catch (alterErr: any) {
      console.warn('sync alter 失败（SQLite 不支持复杂结构变更），改用常规 sync：', alterErr.message || alterErr.name);
      await sequelize.sync();
    }
    console.log('数据库同步完成');

    const User = (await import('./models/User')).default;
    const userCount = await User.count();
    if (userCount === 0) {
      const { seedData } = await import('./seed-data');
      await seedData();
      console.log('种子数据已初始化');
    }

    app.listen(PORT, () => {
      console.log(`班车预约系统后端服务已启动: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

startServer();

export default app;
