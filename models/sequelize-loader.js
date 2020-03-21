'use strict';
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  'postgres://postgres:postgres@localhost/schedule_arranger',
  {
    operatorsAliases: false,
    logging: false  // yarn test の時にログが表示されなくなるので見やすくなる
  });

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};
