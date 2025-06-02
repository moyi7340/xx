// xx/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database.js'); // 调整路径以正确指向 database.js
const authenticateToken = require('../middleware/authenticateToken.js'); // 引入认证中间件

// !! 请务必修改为一个复杂且唯一的密钥 !!
// 确保这个密钥与你在 authenticateToken.js 中使用的 JWT_SECRET 完全一致
const JWT_SECRET = 'fate3238704302';

// 用户注册接口 (POST /api/auth/register)
router.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: '密码长度至少为6位' });
    }

    // 检查用户名是否已存在
    const sqlCheckUser = "SELECT * FROM users WHERE username = ?";
    db.get(sqlCheckUser, [username], (err, row) => {
        if (err) {
            console.error("注册时查询用户失败:", err.message);
            return res.status(500).json({ message: '服务器内部错误，请稍后再试' });
        }
        if (row) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 哈希密码
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        // 插入新用户
        const sqlInsertUser = "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 0, datetime('now', 'localtime'))"; // 默认非管理员
        db.run(sqlInsertUser, [username, passwordHash], function(err) {
            if (err) {
                console.error("插入新用户失败:", err.message);
                return res.status(500).json({ message: '注册失败，请稍后再试' });
            }
            res.status(201).json({ message: '用户注册成功', userId: this.lastID });
        });
    });
});

// 用户登录接口 (POST /api/auth/login)
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const sqlGetUser = "SELECT * FROM users WHERE username = ?";
    db.get(sqlGetUser, [username], (err, user) => {
        if (err) {
            console.error("登录时查询用户失败:", err.message);
            return res.status(500).json({ message: '服务器内部错误，请稍后再试' });
        }
        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' }); // 用户不存在
        }

        // 验证密码
        const isPasswordCorrect = bcrypt.compareSync(password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: '用户名或密码错误' }); // 密码不匹配
        }

        // 生成 JWT
        const payload = {
            userId: user.id,
            username: user.username,
            isAdmin: user.is_admin === 1 // 确保是布尔值
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }); // token 有效期 24 小时

        res.status(200).json({
            message: '登录成功',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.is_admin === 1
            }
        });
    });
});

// 用户修改自己的密码 (PUT /api/auth/change-password)
// 此路由需要用户已登录
router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId; // 从token中获取用户ID

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: '当前密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: '新密码长度至少为6位' });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ message: '新密码不能与当前密码相同' });
    }

    try {
        // 1. 获取当前用户的密码哈希
        const userSql = "SELECT password_hash FROM users WHERE id = ?";
        const user = await new Promise((resolve, reject) => {
            db.get(userSql, [userId], (err, row) => {
                if (err) {
                    console.error("修改密码时查询用户信息失败:", err.message);
                    reject(new Error('获取用户信息失败')); // 抛出错误供catch捕获
                } else {
                    resolve(row);
                }
            });
        });

        if (!user) {
            // 理论上 authenticateToken 应该已经保证了用户存在
            return res.status(404).json({ message: '用户未找到' });
        }

        // 2. 验证当前密码
        const isCurrentPasswordCorrect = bcrypt.compareSync(currentPassword, user.password_hash);
        if (!isCurrentPasswordCorrect) {
            return res.status(401).json({ message: '当前密码不正确' });
        }

        // 3. 哈希新密码并更新数据库
        const salt = bcrypt.genSaltSync(10);
        const newPasswordHash = bcrypt.hashSync(newPassword, salt);

        const updateSql = "UPDATE users SET password_hash = ? WHERE id = ?";
        await new Promise((resolve, reject) => {
            db.run(updateSql, [newPasswordHash, userId], function(err) {
                if (err) {
                    console.error("更新用户密码失败:", err.message);
                    reject(new Error('更新密码失败')); // 抛出错误供catch捕获
                } else {
                     // this.changes 在这里可能不总是可靠，依赖无错误即成功
                    if (this.changes === 0) {
                        // 这通常不应该发生，因为我们已经验证了用户存在
                        console.warn(`用户 ${userId} 密码更新影响行数为0，但未报错。`);
                    }
                    resolve(this);
                }
            });
        });

        res.status(200).json({ message: '密码修改成功' });

    } catch (error) {
        // 捕获由 new Promise reject 或其他同步/异步错误抛出的错误
        console.error("修改密码过程中发生错误:", error.message);
        res.status(500).json({ message: error.message || '密码修改失败，请稍后再试' });
    }
});

module.exports = router;
