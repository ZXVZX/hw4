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
  // 取得分頁與排序參數
  let page = parseInt(req.query.page) || 1;
  let pageSize = parseInt(req.query.pageSize) || 10;
  let sortBy = req.query.sortBy === 'price' ? 'price' : 'date';
  let order = req.query.order === 'desc' ? 'DESC' : 'ASC';

  // 篩選條件
  let where = [];
  let params = [];
  // 年份篩選
  if (req.query.yearStart && req.query.yearEnd) {
    where.push(`CAST(substr(date, 1, instr(date, '年')-1) AS INTEGER) BETWEEN ? AND ?`);
    params.push(parseInt(req.query.yearStart), parseInt(req.query.yearEnd));
  }
  // 月份篩選
  if (req.query.monthStart && req.query.monthEnd) {
    where.push(`CAST(substr(date, instr(date, '年')+1, instr(date, '月')-instr(date, '年')-1) AS INTEGER) BETWEEN ? AND ?`);
    params.push(parseInt(req.query.monthStart), parseInt(req.query.monthEnd));
  }
  // 價格下限
  if (req.query.minPrice) {
    where.push('price >= ?');
    params.push(parseFloat(req.query.minPrice));
  }
  // 價格上限
  if (req.query.maxPrice) {
    where.push('price <= ?');
    params.push(parseFloat(req.query.maxPrice));
  }
  let whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

  // 日期排序要轉換為年份和月份
  let orderBySql = '';
  if (sortBy === 'date') {
    orderBySql = `CAST(substr(date, 1, instr(date, '年')-1) AS INTEGER) ${order},
                  CAST(substr(date, instr(date, '年')+1, instr(date, '月')-instr(date, '年')-1) AS INTEGER) ${order}`;
  } else {
    orderBySql = `price ${order}`;
  }

  // 先查總數
  db.get(`SELECT COUNT(*) as count FROM DragonFruitPrice ${whereSql}`, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const total = countRow.count;
    const offset = (page - 1) * pageSize;
    const sql = `SELECT * FROM DragonFruitPrice ${whereSql} ORDER BY ${orderBySql} LIMIT ? OFFSET ?`;
    db.all(sql, [...params, pageSize, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        data: rows,
        total,
        page,
        pageSize
      });
    });
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
