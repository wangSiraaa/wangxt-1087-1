import sequelize from './config/database';
import './models';
import { seedData } from './seed-data';

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('开始插入种子数据...');
    await seedData();
    console.log('种子数据插入完成!');
    process.exit(0);
  } catch (err) {
    console.error('种子数据插入失败:', err);
    process.exit(1);
  }
}

seed();
