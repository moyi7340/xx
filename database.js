// xx/database.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('成功连接到 SQLite 数据库.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error("创建 users 表失败:", err.message);
                } else {
                    const adminUsername = 'yongliang';
                    const adminPassword = 'mm456123'; 
                    db.get("SELECT * FROM users WHERE username = ?", [adminUsername], (err, row) => {
                        if (err) {
                            console.error("查询管理员用户失败:", err.message);
                            return;
                        }
                        if (!row) {
                            const salt = bcrypt.genSaltSync(10);
                            const passwordHash = bcrypt.hashSync(adminPassword, salt);
                            db.run('INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 1, datetime("now", "localtime"))',
                                [adminUsername, passwordHash],
                                (err) => {
                                    if (err) {
                                        console.error("创建默认管理员失败:", err.message);
                                    } else {
                                        console.log(`默认管理员 '${adminUsername}' 创建成功.`);
                                    }
                                }
                            );
                        }
                    });
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS income_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                entry_date TEXT NOT NULL,
                destination TEXT NOT NULL,
                custom_destination TEXT,
                amount REAL NOT NULL,
                is_oil_expense INTEGER DEFAULT 0, 
                settlement_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE SET NULL
            )`, (err) => {
                if (err) console.error("创建 income_entries 表失败:", err.message);
            });

            // 在 settlements 表中添加 total_oil_expense 字段
            db.run(`CREATE TABLE IF NOT EXISTS settlements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                settlement_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                total_amount REAL NOT NULL,
                total_amount_excluding_oil REAL NOT NULL,
                total_oil_expense REAL DEFAULT 0, /* <--- 新增字段 */
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, (err) => {
                if (err) {
                     console.error("创建/修改 settlements 表失败:", err.message);
                } else {
                    // 检查并添加新列 (如果表已存在且没有该列)
                    db.all("PRAGMA table_info(settlements)", (pragmaErr, columns) => {
                        if (pragmaErr) {
                            console.error("无法获取 settlements 表信息:", pragmaErr.message);
                            return;
                        }
                        const hasOilExpenseColumn = columns.some(col => col.name === 'total_oil_expense');
                        if (!hasOilExpenseColumn) {
                            db.run("ALTER TABLE settlements ADD COLUMN total_oil_expense REAL DEFAULT 0", (alterErr) => {
                                if (alterErr) {
                                    console.error("向 settlements 表添加 total_oil_expense 列失败:", alterErr.message);
                                } else {
                                    console.log("成功向 settlements 表添加 total_oil_expense 列。");
                                }
                            });
                        }
                    });
                }
            });
        });
    }
});

module.exports = db;
