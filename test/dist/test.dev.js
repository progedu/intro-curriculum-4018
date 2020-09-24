'use strict';

var request = require('supertest');

var app = require('../app');

var passportStub = require('passport-stub');

var User = require('../models/user');

var Schedule = require('../models/schedule');

var Candidate = require('../models/candidate');

describe('/login', function () {
  before(function () {
    passportStub.install(app);
    passportStub.login({
      username: 'testuser'
    });
  });
  after(function () {
    passportStub.logout();
    passportStub.uninstall(app);
  });
  it('ログインのためのリンクが含まれる', function (done) {
    request(app).get('/login').expect('Content-Type', 'text/html; charset=utf-8').expect(/<a href="\/auth\/github"/).expect(200, done);
  });
  it('ログイン時はユーザー名が表示される', function (done) {
    request(app).get('/login').expect(/testuser/).expect(200, done);
  });
});
describe('/logout', function () {
  it('/ にリダイレクトされる', function (done) {
    request(app).get('/logout').expect('Location', '/').expect(302, done);
  });
});
describe('/schedules', function () {
  before(function () {
    passportStub.install(app);
    passportStub.login({
      id: 0,
      username: 'testuser'
    });
  });
  after(function () {
    passportStub.logout();
    passportStub.uninstall(app);
  });
  it('予定が作成でき、表示される', function (done) {
    User.upsert({
      userId: 0,
      username: 'testuser'
    }).then(function () {
      request(app).post('/schedules').send({
        scheduleName: 'テスト予定1',
        memo: 'テストメモ1\r\nテストメモ2',
        candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
      }).expect('Location', /schedules/).expect(302).end(function (err, res) {
        var createdSchedulePath = res.headers.location;
        request(app).get(createdSchedulePath).expect(/テスト予定1/).expect(/テストメモ1/).expect(/テストメモ2/).expect(/テスト候補1/).expect(/テスト候補2/).expect(/テスト候補3/).expect(200).end(function (err, res) {
          if (err) return done(err); // テストで作成したデータを削除

          var scheduleId = createdSchedulePath.split('/schedules/')[1];
          Candidate.findAll({
            where: {
              scheduleId: scheduleId
            }
          }).then(function (candidates) {
            var promises = candidates.map(function (c) {
              return c.destroy();
            });
            Promise.all(promises).then(function () {
              Schedule.findByPk(scheduleId).then(function (s) {
                s.destroy().then(function () {
                  if (err) return done(err);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});