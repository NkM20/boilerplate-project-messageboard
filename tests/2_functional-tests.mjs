import * as chai from 'chai';
import chaiHttp from 'chai-http';
import * as server from '../server.js'; // Adjust the path if needed

chai.use(chaiHttp);
const { assert } = chai;

describe('Functional Tests', function () {
  let threadId; // We'll create a new thread for each test needing it
  let replyId;

  // Test 1: Create a new thread
  it('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    const threadData = {
      text: 'This is a test thread',
      delete_password: 'password'
    };

    chai.request(server)
      .post('/api/threads/testboard') // Replace 'testboard' with your actual board name
      .send(threadData)
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        threadId = res.body._id; // Store the thread ID for further tests
        done();
      });
  });

  // Test 2: View the 10 most recent threads with the most recent replies
  it('Viewing the 10 most recent threads: GET request to /api/threads/{board}', function (done) {
    chai.request(server)
      .get('/api/threads/testboard') // Replace 'testboard' with your actual board name
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        res.body.forEach(thread => {
          assert.property(thread, '_id');
          assert.property(thread, 'text');
        });
        done();
      });
  });

  // Test 3: Delete a thread with the correct password
  it('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function (done) {
    const deleteData = {
      thread_id: threadId,
      delete_password: 'password'
    };

    chai.request(server)
      .delete('/api/threads/testboard') // Replace 'testboard' with your actual board name
      .send(deleteData)
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  // Test 4: Report a thread
  it('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    // Create a new thread for reporting
    const threadData = {
      text: 'Thread to report',
      delete_password: 'password'
    };

    chai.request(server)
      .post('/api/threads/testboard') // Replace 'testboard' with your actual board name
      .send(threadData)
      .end(function (err, res) {
        assert.isNull(err);
        const reportThreadId = res.body._id;
        
        const reportData = { report_id: reportThreadId };
        chai.request(server)
          .put('/api/threads/testboard') // Replace 'testboard' with your actual board name
          .send(reportData)
          .end(function (err, res) {
            assert.isNull(err);
            assert.equal(res.status, 200);
            assert.equal(res.text, 'reported');
            done();
          });
      });
  });

  // Test 5: Create a reply to a thread
  it('Creating a reply: POST request to /api/replies/{board}', function (done) {
    const replyData = {
      text: 'This is a test reply',
      delete_password: 'password'
    };

    chai.request(server)
      .post('/api/replies/testboard') // Replace 'testboard' with your actual board name
      .send({ ...replyData, thread_id: threadId })
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        replyId = res.body._id; // Store reply ID for later tests
        done();
      });
  });

  // Test 6: View all replies for a thread
  it('Viewing all replies for a thread: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get(`/api/replies/testboard?thread_id=${threadId}`) // Replace 'testboard' with your actual board name
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'replies');
        assert.isArray(res.body.replies);
        done();
      });
  });

  // Test 7: Delete a reply with the correct password
  it('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function (done) {
    const deleteData = {
      thread_id: threadId,
      reply_id: replyId,
      delete_password: 'password'
    };

    chai.request(server)
      .delete('/api/replies/testboard') // Replace 'testboard' with your actual board name
      .send(deleteData)
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  // Test 8: Report a reply
  it('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    const reportData = { thread_id: threadId, reply_id: replyId };

    chai.request(server)
      .put('/api/replies/testboard') // Replace 'testboard' with your actual board name
      .send(reportData)
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  // Test 9: View threads with pagination
  it('Viewing threads with pagination: GET request to /api/threads/{board}?page=2', function (done) {
    chai.request(server)
      .get('/api/threads/testboard?page=2') // Replace 'testboard' with your actual board name
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        done();
      });
  });

  // Test 10: Check that a reply is marked as deleted when deleting with the wrong password
  it('Reply marked as deleted with the wrong password: DELETE request to /api/replies/{board}', function (done) {
    const wrongDeleteData = {
      thread_id: threadId,
      reply_id: replyId,
      delete_password: 'wrongpassword'
    };

    chai.request(server)
      .delete('/api/replies/testboard') // Replace 'testboard' with your actual board name
      .send(wrongDeleteData)
      .end(function (err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });
});
