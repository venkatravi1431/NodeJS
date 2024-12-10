const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

const dbPromise = sqlite.open({
    filename: './database/users.db',
    driver: sqlite3.Database,
  });

  async function createUserTable() {
    try {
      const db = await dbPromise;
      await db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL
      )`);
    } catch (err) {
      console.error('Error creating table:', err);
    }
  }

  async function createExerciseTable() {
    try {
      const db = await dbPromise;
      await db.run(`CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        description TEXT NOT NULL,
        duration INTEGER NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
    } catch (err) {
      console.error('Error creating table:', err);
    }
  }
  
  createUserTable();
  createExerciseTable();

async function createUser(req,res) {
    try {
        const username = req.body.username;
        const db = await dbPromise;
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
        const result = await db.run('INSERT INTO users (username) VALUES (?)', [username]);
        const newUser = { id: result.lastID, username };
        res.status(201).json(newUser);
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
}

async function getAllUsers(res) {
  try {
    const db = await dbPromise;
    const users = await db.all('SELECT * FROM users');
    if (users.length === 0) {
      res.status(404).json({ error: 'No users found' });
    } else {
      res.status(200).json(users);
    }
  } catch (err) {
    console.error('Error retrieving users:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

async function postExercise(userId, description, duration, date, res) {

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  const numericDuration = Number(duration);
  if (!duration || isNaN(numericDuration) || numericDuration <= 0 || !Number.isInteger(numericDuration)) {
    return res.status(400).json({ error: 'Duration is required and must be a positive number.' });
  }

  date = date ? date : new Date().toISOString().split('T')[0];
  if (!validateDateFormat(date)) {
    return res.status(400).json({ error: 'Date must be in the format YYYY-MM-DD.' });
  }
  if (!validateDate(date)) {
    return res.status(400).json({ error: 'Date is invalid.' });
  }
  const exerciseDate = date;

  try {
    const db = await dbPromise;
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(400).json({ error: `No User found for this id ${userId}` });
    }
    const result = await db.run(
      'INSERT INTO exercises (user_id, description, duration, date) VALUES (?, ?, ?, ?)',
      [userId, description, numericDuration, exerciseDate]
    );
    const createdExercise = {
      userId,
      exerciseId: result.lastID,
      description,
      duration: numericDuration,
      date: exerciseDate,
    };
    res.status(200).json(createdExercise);
  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).json({ error: 'Failed to log exercise.' });
  }
}

async function getUserExerciseLog(userId, { from, to, limit }, res) {
  try {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let dateFilter = '';
    const params = [userId];
    if (from) {
      if(validateDateFormat(from) && validateDate(from)){
        dateFilter += ' AND date >= ?';
        params.push(from);
      } else {
        return res.status(400).json({ error: 'Enter a valid From date format should be YYYY-MM-DD.' });
      }
    }
    if (to) {
      if (validateDateFormat(to) && validateDate(to)){
        dateFilter += ' AND date <= ?';
        params.push(to);
      } else {
        return res.status(400).json({ error: 'Enter a valid To date format should be YYYY-MM-DD.' });
      }
    }
    let limitClause = '';
    if (limit) {
      const numericLimit = Number(limit);
      if (!numericLimit || isNaN(numericLimit) || numericLimit <= 0 || !Number.isInteger(numericLimit)) {
        return res.status(400).json({ error: 'Limit should be positive number' });
      }
      limitClause = ' LIMIT ?';
      params.push(numericLimit);
    }
    const exercises = await db.all(
      `SELECT * FROM exercises WHERE user_id = ?${dateFilter} ORDER BY date ASC${limitClause}`,
      params
    );
    const userExerciseLog = {
      id: user.id,
      username: user.username,
      logs: exercises.map((exercise) => ({
        id: exercise.id,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date,
      })),
      count: exercises.length,
    };
    res.status(200).json(userExerciseLog);
  } catch (err) {
    console.error('Error fetching exercise log:', err);
    res.status(500).json({ error: 'Failed to retrieve exercise log' });
  }
}

function validateDate(date) {
  const parsedDate = new Date(date);
  const isValidDate = parsedDate instanceof Date && !isNaN(parsedDate.getTime()) && parsedDate.toISOString().split('T')[0] === date;
  if (!isValidDate) {
    return false;
  } else {
    return true;
  }
}

function validateDateFormat(date) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (date && !dateRegex.test(date)) {
    return false;
  } else {
    return true;
  }
}

module.exports = { createUser, getAllUsers, postExercise, getUserExerciseLog };