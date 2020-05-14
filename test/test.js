//「予定が作成でき、表示される」ことのテスト実装
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
    //まず userId が 0 で username が、testuserの ユーザーをデータベース上に作成
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        // その後、 POST メソッドを使い予定と候補を作成
        .post('/schedules')
        .send({ scheduleName: 'テスト予定1', memo: 'テストメモ1\r\nテストメモ2', candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3' })
        .expect('Location', /schedules/)
        .expect(302)
        .end((err, res) => {
          let createdSchedulePath = res.headers.location;
          request(app)
            .get(createdSchedulePath)

            // TODO 作成された予定と候補が表示されていることをテストする
            .expect(/テスト予定1/)
            .expect(/テストメモ1/)
            .expect(/テストメモ2/)
            .expect(/テスト候補1/)
            .expect(/テスト候補2/)
            .expect(/テスト候補3/)

            .expect(200)//そこからリダイレクトされることを検証し、予定が表示されるページヘの アクセスが 200 のステータスコードであることを検証しています。
            .end((err, res) => {
              if (err) return done(err);
              //テストが終わった後に、テストで作成されたユーザー以外の データを削除する処理が加えられています。
              // テストで作成したデータを削除
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              Candidate.findAll({
                where: { scheduleId: scheduleId }
              }).then((candidates) => {
                const promises = candidates.map((c) => { return c.destroy(); });
                Promise.all(promises).then(() => {//Promise.all 関数 は、 配列で渡された全ての Promise が終了した際に結果を返す、 Promise オブジェクトを作成します。
                                                  //なお、空配列が渡された場合も Promise オブジェクトが作成されます。
                  Schedule.findByPk(scheduleId).then((s) => { //ここで使われている findByPk 関数は、 モデルに対応するデータを主キーによって 1 行だけ取得することができる関数です。
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
