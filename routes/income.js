// xx/routes/income.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const authenticateToken = require('../middleware/authenticateToken.js'); // 引入认证中间件

// 所有在此路由文件中的接口都需要认证
router.use(authenticateToken);

// 添加新的收入记录 (POST /api/income)
router.post('/', (req, res) => {
    const { entry_date, destination, custom_destination, amount, is_oil_expense } = req.body;
    const userId = req.user.userId; // 从认证中间件获取用户ID

    // 基本验证
    if (!entry_date || !destination || amount == null) {
        return res.status(400).json({ message: "日期、目的地和金额是必填项" });
    }
    if (destination === '其他' && !custom_destination) {
        return res.status(400).json({ message: "选择其他目的地时，必须填写自定义目的地名称" });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "金额必须是正数" });
    }

    const sql = `INSERT INTO income_entries (user_id, entry_date, destination, custom_destination, amount, is_oil_expense, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    const params = [
        userId,
        entry_date,
        destination,
        destination === '其他' ? custom_destination : null,
        amount,
        is_oil_expense ? 1 : 0 // 将布尔值或0/1转换为数据库中的0或1
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error("添加收入记录失败:", err.message);
            return res.status(500).json({ message: "添加收入记录失败，请稍后再试" });
        }
        res.status(201).json({
            message: "收入记录添加成功",
            id: this.lastID,
            user_id: userId,
            entry_date,
            destination,
            custom_destination: destination === '其他' ? custom_destination : null,
            amount,
            is_oil_expense: is_oil_expense ? 1 : 0,
            settlement_id: null // 新添加的记录尚未结算
        });
    });
});

// 获取当前用户未结算的收入记录 (GET /api/income)
router.get('/', (req, res) => {
    const userId = req.user.userId;
    // 查询 settlement_id 为 NULL 且属于当前用户的记录，并按创建时间降序排列
    const sql = "SELECT * FROM income_entries WHERE user_id = ? AND settlement_id IS NULL ORDER BY created_at DESC";

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error("查询未结算收入记录失败:", err.message);
            return res.status(500).json({ message: "获取收入列表失败，请稍后再试" });
        }
        res.status(200).json(rows);
    });
});

// 删除指定的收入记录 (DELETE /api/income/:id)
router.delete('/:id', (req, res) => {
    const entryId = req.params.id;
    const userId = req.user.userId;

    // 首先验证该记录是否属于当前用户且未结算 (通常只允许删除未结算的)
    const checkSql = "SELECT * FROM income_entries WHERE id = ? AND user_id = ?";
    db.get(checkSql, [entryId, userId], (err, row) => {
        if (err) {
            console.error("查询收入记录失败:", err.message);
            return res.status(500).json({ message: "服务器内部错误" });
        }
        if (!row) {
            return res.status(404).json({ message: "未找到要删除的记录，或您无权删除此记录" });
        }
        // (可选) 如果你只想允许删除未结算的记录，可以增加条件：
        // if (row.settlement_id !== null) {
        //     return res.status(400).json({ message: "不能删除已结算的收入记录" });
        // }

        const deleteSql = "DELETE FROM income_entries WHERE id = ? AND user_id = ?";
        db.run(deleteSql, [entryId, userId], function(err) {
            if (err) {
                console.error("删除收入记录失败:", err.message);
                return res.status(500).json({ message: "删除失败，请稍后再试" });
            }
            if (this.changes === 0) {
                // 虽然前面的检查已经覆盖，但这是一个额外的保险
                return res.status(404).json({ message: "未找到要删除的记录，或记录已被删除" });
            }
            res.status(200).json({ message: "收入记录删除成功", id: entryId });
        });
    });
});

module.exports = router;