var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const sqlite3 = require('sqlite3').verbose();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const dbPath = path.join(__dirname, 'db', 'sqlite.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('資料庫開啟失敗:', err.message);
  } else {
    console.log('成功連接到資料庫:', dbPath);
  }
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/guava', (req, res) => {
  db.all('SELECT * FROM DragonFruitPrice', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/insert', (req, res) => {
  // 不用 JSON，直接從 req.body 取值
  const { date, price, amount } = req.body;
  if (!date || !price) {
    return res.status(400).send('缺少必要欄位');
  }
  const stmt = db.prepare('INSERT INTO DragonFruitPrice (name, date, price) VALUES (?, ?, ?)');
  stmt.run('紅龍果', date, price, function(err) {
    if (err) {
      return res.status(500).send('資料庫寫入失敗');
    }
    res.send('新增成功');
  });
  stmt.finalize();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
