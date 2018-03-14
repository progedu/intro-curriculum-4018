// 厳格モード
'use strict';

console.log('テスト開始');

// テスト用モジュール読み込み
const request = require('supertest');

// app.js読み込み
const app = require('../app');

// User
const User = require('../models/user');
const Candidate = require('../models/candidate');
const Schedule = require('../models/schedule');

// passport-stubモジュール読み込み
// スタブ：テスト対象から呼び出される別のモジュールの代用品
const passportStub = require('passport-stub');

// mochaのテストの書式
// 第一引数：一連のテストの名前
// 第二引数：個々のテスト処理(it処理)を含む無名関数
describe('/login',
  () => {
    console.log('/login関連のテスト開始');
    // 一連のit処理の前に実行される処理
    before(
      () => {
        console.log('BEFORE処理開始');
        // passportStubをインストールする 
        passportStub.install(app);
        // usernameプロパティを指定する…のは
        // passportの仕様に従ってるんじゃないかなぁ
        passportStub.login({ username: 'testuser' });
        console.log('BEFORE処理終了');
      }
    );

    // 一連のit処理の後に実行される処理
    after(
      () => {
        console.log('AFTER処理開始');
        // ログアウト
        passportStub.logout();
        // ↓必要なのかどうかよくわからない
        passportStub.uninstall(app);
        console.log('AFTER処理完了');
      }
    );

    // 個々のテスト処理
    // 第一引数：個々のテストの名前
    // 第二引数：実際のテスト処理を行う関数(assert処理など)
    it('ログインのためのリンクが含まれる',
      // supertestモジュールの書式
      // ドキュメント：https://github.com/visionmedia/supertest
      (done) => {
        console.log('test1開始');
        // 対象のアプリを引数にオブジェクトを作成して
        request(app)
          // /loginにアクセスして
          .get('/login')
          // ヘッダの値をチェックして
          .expect('Content-Type', 'text/html; charset=utf-8')
          // <body>タグ内に
          // <a href="auth/github"という文字列があるかをチェックする
          .expect(/<a href="\/auth\/github"/)
          // 期待されるステータスコードと引数のCB関数を渡すと終了？
          .expect(200, done);
        console.log('test1完了');
      }
    );

    // 大体↑と一緒
    it('ログイン時はユーザー名が表示される',
      (done) => {
        console.log('test2開始');
        request(app)
          .get('/login')
          .expect(/testuser/)
          .expect(200, done);
        console.log('test2完了');
      }
    );
  }
);

describe('/logout',
  () => {
    console.log('/logout関連のテスト開始');

    // 個々のテスト処理
    // 第一引数：個々のテストの名前
    // 第二引数：実際のテスト処理を行う関数(assert処理など)
    it('/logout にアクセスした際に / にリダイレクトされる',
      (done) => {
        console.log('test3開始');
        request(app)
          .get('/logout')
          .expect('Location', '/')
          .expect(302, done);
        console.log('test3完了');
      }
    );
  }
);

// schedule関連のテスト
describe('/schedules', () => {
  // テスト前処理
  before(() => {
    // passportStubを作成
    passportStub.install(app);
    // stubを使ってログイン
    passportStub.login({ id: 0, username: 'testuser' });
  });
  // テスト後処理
  after(() => {
    // ログアウト
    passportStub.logout();
    // 一応アンインスコ
    passportStub.uninstall(app);
  });

  it('予定が作成でき、表示される', (done) => {
    console.log('テスト開始：予定が作成でき、表示される');
    // Userモデルを作成して
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      // うまくいったらテスト開始
      request(app)
        // schedulesにPOSTでデータを渡す
        // ここで１つのScheduleと複数のCandidateがデータベースに登録される
        .post('/schedules')
        .send({ scheduleName: 'テスト予定1', memo: 'テストメモ1\r\nテストメモ2', candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3' })
        // schedulesにリダイレクトされるか
        .expect('Location', /schedules/)
        // 302 redirectか
        .expect(302)
        // 終わったら次ののテストに移る
        .end((err, res) => {
          const createdSchedulePath = res.headers.location;
          console.dir(res.headers);
          console.log('createdSchedulePath => ' + createdSchedulePath);
          // createdSchedulePath => /schedules/{scheduleId}
          // テスト開始
          request(app)
            // /schedules/{scheduleId}にGETでアクセスして
            .get(createdSchedulePath)
            // ちゃんと表示されてることを確認する
            .expect(/テスト予定1/)
            .expect(/テストメモ1/)
            .expect(/テストメモ2/)
            .expect(/テスト候補1/)
            .expect(/テスト候補2/)
            .expect(/テスト候補3/)
            // 200 アクセス成功
            .expect(200)
            // 終わったら次のテストに移る
            .end((err, res) => {
              // テストで作成したデータを削除
              // createdSchedulePath => /schedules/{scheduleId}
              // からsplitでscheduleIDを取得する
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              console.log('scheduleId => ' + scheduleId);
              // 発行されるSQL
              // SELECT
              //   "candidateId",
              //   "candidateName",
              //   "scheduleId"
              // FROM
              //   "candidates" AS "candidates"
              // WHERE
              //   "candidates"."scheduleId" = 'xxxxxxxxxxxxxxxxxxx';
              // scheduleIdと合致するCandidateモデルを取得して
              Candidate.findAll({
                where: { scheduleId: scheduleId }
              }).then((candidates) => {
                // 取得したCandidateをすべて削除し
                candidates.forEach((c) => { c.destroy(); });
                // 大本のScheduleモデルも削除する
                Schedule.findById(scheduleId).then((s) => { s.destroy(); });
              });
              // エラーでも終了
              if (err) return done(err);
              // 正常でも終了
              done();
            });
        });
    });
    console.log('テスト終了：予定が作成でき、表示される');
  });

});