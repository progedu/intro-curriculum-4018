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
    // userId が 0　で username が、testuser のユーザーをデータベース上に作成
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        // POST メソッドを使い予定と候補を作成
        .post('/schedules')
        .send({ scheduleName: 'テスト予定1', memo: 'テストメモ1\r\nテストメモ2', candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3' })
        .expect('Location', /schedules/)
        .expect(302)
        .end((err, res) => {
          let createdSchedulePath = res.headers.location;
          request(app)
            .get(createdSchedulePath)
            // .expect(/文字列/) で正規表現を書くことで、レスポンスに含まれる文字列がある場合は
            // テストを成功させ、含まれない場合はテストを失敗させるように実装することができる。
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
              }).then((candidates) => {
                const promises = candidates.map((c) => { return c.destroy(); });
                // Promise.all 関数は、配列で渡された全ての Promise が終了した際に結果を返す、
                // Promise　オブジェクトを作成する。
                // Promise オブジェクトの結果は、then 関数に関数を渡して利用できる。
                Promise.all(promises).then(() => {
                  // findByPk 関数は、モデルに対応するデータを主キーによって一行だけ取得できる。
                  Schedule.findByPk(scheduleId).then((s) => { 
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
