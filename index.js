const express = require('express')
const { createUser, getAllUsers, postExercise, getUserExerciseLog  } = require('./dbservice')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

app.post('/api/users', async (req, res) => {
  return createUser(req,res);
});

app.get('/api/users', async (req, res) => {
  return getAllUsers(res);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  return postExercise(_id, description, duration, date, res);
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  return getUserExerciseLog(_id, { from, to, limit }, res);
});