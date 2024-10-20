const express = require('express');
const router = express.Router();
const { Thread, Reply } = require('../models/Thread'); // Adjust this path as needed

// Utility function to get current time in ISO format without milliseconds
const getCurrentTime = () => new Date().toISOString().split('.')[0] + 'Z';

// POST request to create a new thread
router.post('/threads/:board', (req, res) => {
  const { text, delete_password } = req.body;

  if (!text || !delete_password) {
    return res.status(400).json({ error: 'Text and delete password are required.' });
  }

  const newThread = new Thread({
    board: req.params.board,
    text,
    delete_password,
    created_on: getCurrentTime(),
    bumped_on: getCurrentTime(),
    reported: false,
    replies: [],
  });

  newThread.save()
    .then(thread => {
      res.status(201).json(thread.toObject({ 
        versionKey: false, 
        transform: (doc, ret) => { 
          delete ret.delete_password; 
          delete ret.reported; 
          return ret; 
        },
      }));
    })
    .catch(err => res.status(500).json({ error: 'Failed to create thread.', details: err.message }));
});

// POST request to add a reply to a thread
router.post('/replies/:board', (req, res) => {
  const { text, delete_password, thread_id } = req.body;

  if (!text || !delete_password || !thread_id) {
    return res.status(400).json({ error: 'Text, delete password, and thread ID are required.' });
  }

  Thread.findById(thread_id)
    .then(thread => {
      if (!thread) return res.status(404).json({ error: 'Thread not found.' });

      const newReply = new Reply({
        text,
        delete_password,
        created_on: getCurrentTime(),
        reported: false,
      });

      thread.replies.push(newReply);
      thread.bumped_on = getCurrentTime(); // Update bumped_on to the current time

      return thread.save()
        .then(() => {
          res.status(201).json(newReply.toObject({ 
            versionKey: false, 
            transform: (doc, ret) => { 
              delete ret.delete_password; 
              delete ret.reported; 
              return ret; 
            },
          }));
        })
        .catch(err => res.status(500).json({ error: 'Failed to save reply.', details: err.message }));
    })
    .catch(err => res.status(500).json({ error: 'Failed to find thread.', details: err.message }));
});

// GET request to fetch the most recent 10 bumped threads
router.get('/threads/:board', (req, res) => {
  Thread.find({ board: req.params.board })
    .sort({ bumped_on: -1 })
    .limit(10)
    .select('-reported -delete_password') // Exclude sensitive fields
    .then(threads => {
      const threadsWithReplies = threads.map(thread => ({
        ...thread.toObject({ versionKey: false }),
        replies: thread.replies.slice(-3).map(reply => reply.toObject({ 
          versionKey: false, 
          transform: (doc, ret) => { 
            delete ret.delete_password; 
            delete ret.reported; 
            return ret; 
          },
        })),
      }));
      res.json(threadsWithReplies);
    })
    .catch(err => res.status(500).json({ error: 'Failed to fetch threads.', details: err.message }));
});

// GET request to fetch a single thread with all replies
router.get('/replies/:board', (req, res) => {
  const { thread_id } = req.query;

  if (!thread_id) {
    return res.status(400).json({ error: 'Thread ID is required.' });
  }

  Thread.findById(thread_id)
    .select('-reported -delete_password') // Exclude sensitive fields
    .then(thread => {
      if (!thread) return res.status(404).json({ error: 'Thread not found.' });

      const repliesWithoutPasswords = thread.replies.map(reply => reply.toObject({ 
        versionKey: false, 
        transform: (doc, ret) => { 
          delete ret.delete_password; 
          delete ret.reported; 
          return ret; 
        },
      }));

      res.json({
        ...thread.toObject({ versionKey: false }),
        replies: repliesWithoutPasswords,
      });
    })
    .catch(err => res.status(500).json({ error: 'Failed to fetch replies.', details: err.message }));
});

// DELETE request to delete a thread
router.delete('/threads/:board', (req, res) => {
  const { thread_id, delete_password } = req.body;

  if (!thread_id || !delete_password) {
    return res.status(400).send('Thread ID and delete password are required.');
  }

  Thread.findById(thread_id)
    .then(thread => {
      if (!thread) {
        return res.status(404).send('Thread not found.');
      }

      // Check if the provided delete password matches
      if (thread.delete_password === delete_password) {
        return Thread.findByIdAndDelete(thread_id) // Use findByIdAndDelete instead
          .then(() => res.send('success'))
          .catch(err => {
            console.error('Error removing thread:', err);
            return res.status(500).send('Failed to delete thread.');
          });
      } else {
        return res.send('incorrect password');
      }
    })
    .catch(err => {
      console.error('Error finding thread:', err);
      return res.status(500).send('Failed to delete thread.');
    });
});

// DELETE request to delete a reply
router.delete('/replies/:board', (req, res) => {
  const { thread_id, reply_id, delete_password } = req.body;

  if (!thread_id || !reply_id || !delete_password) {
    return res.status(400).send('Thread ID, reply ID, and delete password are required.');
  }

  Thread.findOne({ _id: thread_id, 'replies._id': reply_id })
    .then(thread => {
      if (!thread) return res.status(404).send('Thread or reply not found.');

      const reply = thread.replies.id(reply_id);
      if (reply && reply.delete_password === delete_password) {
        reply.text = '[deleted]'; // Mark the reply as deleted
        return thread.save()
          .then(() => res.send('success'))
          .catch(err => {
            console.error('Error deleting reply:', err);
            return res.status(500).send('Failed to delete reply.');
          });
      } else {
        return res.send('incorrect password');
      }
    })
    .catch(err => {
      console.error('Error finding reply:', err);
      return res.status(500).send('Failed to delete reply.');
    });
});

// PUT request to report a thread
router.put('/threads/:board', (req, res) => {
  const { thread_id } = req.body;

  if (!thread_id) {
    return res.status(400).send('Thread ID is required.');
  }

  Thread.findByIdAndUpdate(thread_id, { reported: true }, { new: true })
    .then(() => res.send('reported'))
    .catch(err => {
      console.error('Error reporting thread:', err);
      return res.status(500).send('Failed to report thread.');
    });
});

// PUT request to report a reply
router.put('/replies/:board', (req, res) => {
  const { thread_id, reply_id } = req.body;

  if (!thread_id || !reply_id) {
    return res.status(400).send('Thread ID and reply ID are required.');
  }

  Thread.findOneAndUpdate(
    { _id: thread_id, 'replies._id': reply_id },
    { $set: { 'replies.$.reported': true } },
    { new: true }
  )
    .then(() => res.send('reported'))
    .catch(err => {
      console.error('Error reporting reply:', err);
      return res.status(500).send('Failed to report reply.');
    });
});

// Export the router to be used in your main app file
module.exports = router;
