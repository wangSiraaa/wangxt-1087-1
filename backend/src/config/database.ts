import { Sequelize } from 'sequelize';

const storage = process.env.DB_STORAGE || (__dirname + '/../data/shuttle.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
