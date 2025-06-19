const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

let testThreadId;
let testReplyId;
const testBoard = 'fcc-test-board';
const threadPassword = 'pass123';
const replyPassword = 'replypass';

suite('Functional Tests', function () {

  suite('API ROUTING FOR /api/threads/:board', function () {

    test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
      chai.request(server)
        .post(`/api/threads/${testBoard}`)
        .send({ text: 'Test thread', delete_password: threadPassword })
        .end((err, res) => {
          // Your API redirects on POST, so check redirect and then GET to grab thread ID
          assert.equal(res.status, 200);
          assert.include(res.redirects[0], `/b/${testBoard}/`);
          // Now get threads to find the created one
          chai.request(server)
            .get(`/api/threads/${testBoard}`)
            .end((err, res) => {
              assert.equal(res.status, 200);
              assert.isArray(res.body);
              const thread = res.body.find(t => t.text === 'Test thread');
              assert.exists(thread);
              testThreadId = thread._id;
              done();
            });
        });
    });

    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
      chai.request(server)
        .get(`/api/threads/${testBoard}`)
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtMost(res.body.length, 10);
          res.body.forEach(thread => {
            assert.notProperty(thread, 'delete_password');
            assert.notProperty(thread, 'reported');
            assert.isArray(thread.replies);
            assert.isAtMost(thread.replies.length, 3);
            thread.replies.forEach(reply => {
              assert.notProperty(reply, 'delete_password');
              assert.notProperty(reply, 'reported');
            });
          });
          done();
        });
    });

    test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
      chai.request(server)
        .put(`/api/threads/${testBoard}`)
        .send({ thread_id: testThreadId })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function (done) {
      chai.request(server)
        .delete(`/api/threads/${testBoard}`)
        .send({ thread_id: testThreadId, delete_password: 'wrongpass' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });

    test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function (done) {
      // Create thread to delete
      chai.request(server)
        .post(`/api/threads/${testBoard}`)
        .send({ text: 'Thread to delete', delete_password: 'deletepass' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          // Get thread ID
          chai.request(server)
            .get(`/api/threads/${testBoard}`)
            .end((err, res) => {
              const thread = res.body.find(t => t.text === 'Thread to delete');
              assert.exists(thread);
              chai.request(server)
                .delete(`/api/threads/${testBoard}`)
                .send({ thread_id: thread._id, delete_password: 'deletepass' })
                .end((err, res) => {
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'success');
                  done();
                });
            });
        });
    });

  });

  suite('API ROUTING FOR /api/replies/:board', function () {

    test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
      chai.request(server)
        .post(`/api/replies/${testBoard}`)
        .send({ thread_id: testThreadId, text: 'Test reply', delete_password: replyPassword })
        .end((err, res) => {
          // Your API redirects on POST replies too
          assert.equal(res.status, 200);
          assert.include(res.redirects[0], `/b/${testBoard}/${testThreadId}/`);
          done();
        });
    });

    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
      chai.request(server)
        .get(`/api/replies/${testBoard}`)
        .query({ thread_id: testThreadId })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.property(res.body, 'replies');
          assert.isArray(res.body.replies);
          assert.isAtLeast(res.body.replies.length, 1);
          const reply = res.body.replies.find(r => r.text === 'Test reply');
          assert.exists(reply);
          testReplyId = reply._id;
          assert.notProperty(reply, 'delete_password');
          assert.notProperty(reply, 'reported');
          done();
        });
    });

    test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
      chai.request(server)
        .put(`/api/replies/${testBoard}`)
        .send({ thread_id: testThreadId, reply_id: testReplyId })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function (done) {
      chai.request(server)
        .delete(`/api/replies/${testBoard}`)
        .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'wrongpass' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });

    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function (done) {
      chai.request(server)
        .delete(`/api/replies/${testBoard}`)
        .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: replyPassword })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

  });

});