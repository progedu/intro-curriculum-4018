'use strict';
let request = require('supertest');    // サーバーを起動することなく、ログインの確認ができる
let app = require('../app');    // テストしたいコードが含まれるモジュールのインポート
let passportStub = require('passport-stub');    // github認証を通すことなく、github認証周りのテスト環境がセットできるモジュール
let User = require('../models/user');
let Schedule = require('../models/schedule');
let Candidate = require('../models/candidate');

/* 復習：Jest の記法
 　 describe('テストしたい内容', () => {
     test('テスト内容を文字列で入力', () => {
         return supertest(app).
                  get()
     })
 })
*/
// testuser でログインして、ログアウトできるか確認
describe('/login', () => {
  // github 認証が通るかテスト
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  // ログインの確認
  test('ログインのためのリンクが含まれる', () => {
    return request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/auth\/github"/)
      .expect(200);
  });
  
  test('ログイン時はユーザー名が表示される', () => {
    return request(app)
      .get('/login')
      .expect(/testuser/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('/ にリダイレクトされる', () => {
    return request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302);
  });
});

// データベース schedule のテスト
describe('/schedules', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が作成でき、表示される', done => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/schedules')
        .send({
          scheduleName: 'テスト予定1',
          memo: 'テストメモ1\r\nテストメモ2',
          candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
        })
        .expect('Location', /schedules/)    // リダイレクト先のURLに /schedules/ が含まれているか
        .expect(302)    // リダイレクト
        .end((err, res) => {
          const createdSchedulePath = res.headers.location;
          request(app)
            .get(createdSchedulePath)
            // TODO 作成された予定と候補が表示されていることをテストする
            .expect(/テスト予定1/)
            .expect(/テストメモ1/)
            .expect(/テストメモ2/)
            .expect(/テスト候補1/)
            .expect(/テスト候補2/)
            .expect(/テスト候補3/)
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              // テストで作成したデータを削除
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              Candidate.findAll({
                where: { scheduleId: scheduleId }
              }).then(candidates => {
                const promises = candidates.map(c => {
                  return c.destroy();
                });
                Promise.all(promises).then(() => {
                  Schedule.findByPk(scheduleId).then(s => {
                    s.destroy().then(() => {
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
