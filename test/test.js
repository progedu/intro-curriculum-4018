'use strict';
let request = require('supertest');
let app = require('../app');
let passportStub = require('passport-stub');
let User = require('../models/user');
let Schedule = require('../models/schedule');
let Candidate = require('../models/candidate');

describe('/login', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ username: 'testuser' });
  });

  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('ログインのためのリンクが含まれる', (done) => {
    request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/auth\/github"/)
      .expect(200, done);
  });

  it('ログイン時はユーザー名が表示される', (done) => {
    request(app)
      .get('/login')
      .expect(/testuser/)
      .expect(200, done);
  });
});

describe('/logout', () => {
  it('/ にリダイレクトされる', (done) => {
    request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302, done);
  });
});

describe('/schedules', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('予定が作成でき、表示される', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/schedules')
        .send({ scheduleName: 'テスト予定1', memo: 'テストメモ1\r\nテストメモ2', candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3' })
        .expect('Location', /schedules/)
        .expect(302)
        .end((err, res) => {
          let createdSchedulePath = res.headers.location;//レスポンスヘッダからスケジュールのURLを作成
          request(app)
            .get(createdSchedulePath) //作ったスケジュールのURLにアクセスして、予定が表示されるかテスト
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
              const scheduleId = createdSchedulePath.split('/schedules/')[1]; //URLからscheduleIdを作成
              Candidate.findAll({
                where: { scheduleId: scheduleId } //scheduleIdに対応する候補日を検索
              }).then((candidates) => { 
                const promises = candidates.map((c) => { return c.destroy(); });// 検索結果の候補日を削除
                Promise.all(promises).then(() => { //直前の削除処理が全部終わるまで待つ
                  Schedule.findByPk(scheduleId).then((s) => { //スケジュールを探して削除
                    s.destroy().then(() => {
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
