'use strict';

const BoardModel = require("../models").Board;
const ThreadModel = require("../models").Thread;
const ReplyModel = require("../models").Reply;

module.exports = function (app) {

  // THREADS ROUTES
  app.route('/api/threads/:board')
    // CREATE THREAD
    .post(async (req, res) => {
      try {
        const { text, delete_password } = req.body;
        const board = req.body.board || req.params.board;
        const now = new Date();

        const newThread = {
          text,
          delete_password,
          reported: false,
          created_on: now,
          bumped_on: now,
          replies: []
        };

        let boardData = await BoardModel.findOne({ name: board });

        if (!boardData) {
          boardData = new BoardModel({ name: board, threads: [newThread] });
        } else {
          boardData.threads.push(newThread);
        }

        await boardData.save();
        res.redirect(`/b/${board}/`);
      } catch (err) {
        console.error(err);
        res.status(500).send("Error creating thread");
      }
    })

    // GET 10 MOST RECENT THREADS (with 3 replies)
    .get(async (req, res) => {
      try {
        const board = req.params.board;
        const boardData = await BoardModel.findOne({ name: board });

        if (!boardData) return res.json([]);

        const threads = boardData.threads
          .sort((a, b) => b.bumped_on - a.bumped_on)
          .slice(0, 10)
          .map(thread => {
            const replies = thread.replies
              .sort((a, b) => b.created_on - a.created_on)
              .slice(0, 3)
              .map(reply => ({
                _id: reply._id,
                text: reply.text,
                created_on: reply.created_on,
              }));

            return {
              _id: thread._id,
              text: thread.text,
              created_on: thread.created_on,
              bumped_on: thread.bumped_on,
              replies,
            };
          });

        res.json(threads);
      } catch (err) {
        console.error(err);
        res.status(500).send("Error getting threads");
      }
    })

    // DELETE THREAD
    .delete(async (req, res) => {
      try {
        const { thread_id, delete_password } = req.body;
        const board = req.params.board;
        const boardData = await BoardModel.findOne({ name: board });

        if (!boardData) return res.send("Thread not found");

        const thread = boardData.threads.id(thread_id);
        if (!thread) return res.send("Thread not found");

        if (thread.delete_password !== delete_password) {
          return res.send("incorrect password");
        }

        // Remove thread and mark as modified
        thread.deleteOne();
        boardData.markModified('threads');
        await boardData.save();

        res.send("success");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting thread");
      }
    })

    // REPORT THREAD
    .put(async (req, res) => {
      try {
        const { thread_id } = req.body;
        const board = req.params.board;
        const boardData = await BoardModel.findOne({ name: board });

        const thread = boardData.threads.id(thread_id);
        if (!thread) return res.send("Thread not found");

        thread.reported = true;
        await boardData.save();
        res.send("reported");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error reporting thread");
      }
    });


  // REPLIES ROUTES
  app.route('/api/replies/:board')
    // CREATE REPLY
    .post(async (req, res) => {
      try {
        const { text, delete_password, thread_id } = req.body;
        const board = req.params.board;
        const now = new Date();

        const boardData = await BoardModel.findOne({ name: board });
        const thread = boardData.threads.id(thread_id);

        const newReply = {
          text,
          delete_password,
          created_on: now,
          reported: false,
        };

        thread.replies.push(newReply);
        thread.bumped_on = now;
        await boardData.save();

        res.redirect(`/b/${board}/${thread_id}/`);
      } catch (err) {
        console.error(err);
        res.status(500).send("Error creating reply");
      }
    })

    // GET THREAD WITH ALL REPLIES
    .get(async (req, res) => {
      try {
        const { thread_id } = req.query;
        const board = req.params.board;
        const boardData = await BoardModel.findOne({ name: board });
        const thread = boardData.threads.id(thread_id);

        if (!thread) return res.send("Thread not found");

        const replies = thread.replies.map(reply => ({
          _id: reply._id,
          text: reply.text,
          created_on: reply.created_on,
        }));

        res.json({
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies
        });
      } catch (err) {
        console.error(err);
        res.status(500).send("Error getting replies");
      }
    })

    // DELETE REPLY
    .delete(async (req, res) => {
      try {
        const { thread_id, reply_id, delete_password } = req.body;
        const board = req.params.board;
        const boardData = await BoardModel.findOne({ name: board });
        const thread = boardData.threads.id(thread_id);
        const reply = thread.replies.id(reply_id);

        if (reply.delete_password !== delete_password) {
          return res.send("incorrect password");
        }

        reply.text = "[deleted]";
        await boardData.save();
        res.send("success");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting reply");
      }
    })

    // REPORT REPLY
    .put(async (req, res) => {
      try {
        const { thread_id, reply_id } = req.body;
        const board = req.params.board;
        const boardData = await BoardModel.findOne({ name: board });
        const thread = boardData.threads.id(thread_id);
        const reply = thread.replies.id(reply_id);

        reply.reported = true;
        await boardData.save();
        res.send("reported");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error reporting reply");
      }
    });

};