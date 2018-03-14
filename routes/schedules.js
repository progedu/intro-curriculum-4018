// 厳格モード
'use strict';
// 'debug'モジュール呼び出し
const debug = require('debug');
// デバッガーを作成する
const scheduleJs_debugger = debug('debug:schedule.js');
scheduleJs_debugger('schedule.js処理開始');

// 'node-uuid'モジュール読み込み
// UUIDを生成するために必要
const uuid = require('node-uuid');
// Scheduleモデルを読み込む
const Schedule = require('../models/schedule');
// Candidateモデルを読み込む
const Candidate = require('../models/candidate');
// Userモデルを読み込む
const User = require('../models/user');

// ルーター作成
const express = require('express');
const router = express.Router();

// 認証確認用の自作モジュール読み込み
const authenticationEnsurer = require('./authentication-ensurer');

// GETで/schedules/newにアクセスされた時の処理
router.get('/new', authenticationEnsurer, (req, res, next) => {
  scheduleJs_debugger('GET(schedule/new)処理開始')
  res.render('new', { user: req.user });
  scheduleJs_debugger('GET(schedule/new)処理完了')
});

// POSTでschedules/newからデータを渡された時の処理
router.post('/', authenticationEnsurer, (req, res, next) => {
  // console.dir(req);
  scheduleJs_debugger('POST処理開始')
  // 予定(Schedule)のIDとしてUUIDを生成
  const scheduleId = uuid.v4();
  // 更新日時として現在時刻を設定
  const updatedAt = new Date();
  // Scheduleを生成して
  Schedule.create({
    scheduleId: scheduleId,
    // scheduleNameは255文字までとする
    scheduleName: req.body.scheduleName.slice(0, 255),
    memo: req.body.memo,
    // いつの間にかreq.userにGitHubの情報がわたっている
    createdBy: req.user.id,
    updatedAt: updatedAt
    // Scheduleが生成できれば
  }).then((schedule) => {
    // 候補日のテキストボックスに入力されたデータを
    // trim()して
    // 改行コードでsplit()して配列にして
    // 配列の中身もtrim()した配列を返す？
    const candidateNames = req.body.candidates
      .trim()
      .split('\r\n')
      .map((s) => s.trim());
    // その配列を１つずつCandidateModelっぽいものに変換して
    // CandidateModelっぽいものの配列を作る
    const candidates = candidateNames.map((c) => {
      return {
        candidateName: c,
        scheduleId: schedule.scheduleId
      };
    });
    // 作った配列をまとめてDBに登録して、
    Candidate.bulkCreate(candidates).then(() => {
      // うまくいったら/schedules/{scheduleId}にリダイレクトする
      // 初心者がわかるかこんなもん
      res.redirect('/schedules/' + schedule.scheduleId);
    });
  });
  scheduleJs_debugger('POST処理完了')
});

// schedules/{scheduleId}にGETでアクセスされた時の処理
router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {  
  scheduleJs_debugger('GET(schedule/{scheduleId})処理開始')

  // 発行されるSQL
  // SELECT 
  //   "schedules"."scheduleId",
  //   "schedules"."scheduleName",
  //   "schedules"."memo",
  //   "schedules"."createdBy",
  //   "schedules"."updatedAt",
  //   "user"."userId" AS "user.userId",
  //   "user"."username" AS "user.username"
  // FROM 
  //   "schedules" AS "schedules"
  // LEFT OUTER JOIN
  //   "users" AS "user"
  // ON
  //   "schedules"."createdBy" = "user"."userId"
  // WHERE
  //   "schedules"."scheduleId" = '301316ee-67b1-4f2d-8b56-0e3fc6c815a9'
  // ORDER BY
  //   "updatedAt" DESC;
  Schedule.findOne({
    // Userテーブルと結合しているのだろう
    // DB作成時に従属関係を設定しているので
    // モデル名を指定するだけでいい感じに結合してくれるのだと思う
    // 初めて出てきた文法はちゃんと説明しろぼけ
    include: [
      {
        model: User,
        attributes: ['userId', 'username']
      }],
    // WHERE条件
    where: {
      scheduleId: req.params.scheduleId
    },
    order: '"updatedAt" DESC'
  }).then((schedule) => {
    // scheduleが取得できれば
    if (schedule) {
      // そのスケジュールの候補日をすべて取得する
      Candidate.findAll({
        where: { scheduleId: schedule.scheduleId },
        order: '"candidateId" ASC'
      }).then((candidates) => {
        // 取得したデータを元にscheduleテンプレートを
        // 適用してhtmlを表示する
        res.render('schedule', {
          user: req.user,
          schedule: schedule,
          candidates: candidates,
          users: [req.user]
        });
      });
    } else {
      const err = new Error('指定された予定は見つかりません');
      err.status = 404;
      next(err);
    }
  });
  scheduleJs_debugger('GET(schedule/{scheduleId})処理開始')
});

module.exports = router;