'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('node-uuid');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const User = require('../models/user');

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user });
});

router.post('/', authenticationEnsurer, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255),
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt
  }).then((schedule) => {
    const candidateNames = req.body.candidates.trim().split('\n').map((s) => s.trim());
    const candidates = candidateNames.map((c) => { return {
      candidateName: c,
      scheduleId: schedule.scheduleId
    };});
    Candidate.bulkCreate(candidates).then(() => {
          res.redirect('/schedules/' + schedule.scheduleId);
    });
  });
});

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  Schedule.findOne({
    include: [
      {
        model: User,
        attributes: ['userId', 'username']
      }],
    where: {
      scheduleId: req.params.scheduleId
    },
    order: '"updatedAt" DESC'
  }).then((schedule) => {
    if (schedule) {
      Candidate.findAll({
        where: { scheduleId: schedule.scheduleId },
        order: '"candidateId" ASC'
      }).then((candidates) => {
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
          const createdSchedulePath = res.headers.location;
          request(app)
            .get(createdSchedulePath)
            // TODO 作成された予定と候補が表示されていることをテストする
            .expect(/${テスト予定1}/)
            .expect(/${テストメモ1}/)
            .expect(/${テストメモ2}/)
            .expect(/${テスト候補1}/)
            .expect(/${テスト候補2}/)
            .expect(/${テスト候補3}/)
            .expect(200)
            .end((err, res) => {
              // テストで作成したデータを削除
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              Candidate.findAll({
                where: { scheduleId: scheduleId }
              }).then((candidates) => {
                candidates.forEach((c) => { c.destroy(); });
                Schedule.findById(scheduleId).then((s) => { s.destroy(); });
              });
              if (err) return done(err);
              done();
            });
        });
    });
  });

});

module.exports = router;