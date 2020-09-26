'use strict';
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  'postgres://postgres:postgres@localhost/schedule_arranger',
  {
    operatorsAliases: false,
    logging: false//テスト時ログが出なくなる。見やすい。
  });

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};
