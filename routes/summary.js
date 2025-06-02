// xx/routes/summary.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const authenticateToken = require('../middleware/authenticateToken.js');

router.use(authenticateToken);

// 获取月度收入总览 (GET /api/summary/monthly?year=YYYY&month=MM)
router.get('/monthly', (req, res) => {
    const userId = req.user.userId;
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ message: "年份和月份是必填参数" });
    }
    const formattedMonth = month.toString().padStart(2, '0');
    const yearMonthPrefix = `${year}-${formattedMonth}`;

    const sql = `
        SELECT
            SUM(total_amount) as monthly_total_amount,
            SUM(total_amount_excluding_oil) as monthly_total_amount_excluding_oil,
            SUM(total_oil_expense) as monthly_total_oil_expense /* <--- 新增 */
        FROM settlements
        WHERE user_id = ? AND strftime('%Y-%m', settlement_time) = ?
    `;

    db.get(sql, [userId, yearMonthPrefix], (err, row) => {
        if (err) {
            console.error("查询月度总览失败:", err.message);
            return res.status(500).json({ message: "获取月度总览失败" });
        }
        res.status(200).json({
            year: parseInt(year),
            month: parseInt(month),
            total_amount: row.monthly_total_amount || 0,
            total_amount_excluding_oil: row.monthly_total_amount_excluding_oil || 0,
            total_oil_expense: row.monthly_total_oil_expense || 0 // <--- 新增
        });
    });
});

// 获取年度收入总览 (GET /api/summary/yearly?year=YYYY)
router.get('/yearly', (req, res) => {
    const userId = req.user.userId;
    const { year } = req.query;

    if (!year) {
        return res.status(400).json({ message: "年份是必填参数" });
    }

    const sql = `
        SELECT
            SUM(total_amount) as yearly_total_amount,
            SUM(total_amount_excluding_oil) as yearly_total_amount_excluding_oil,
            SUM(total_oil_expense) as yearly_total_oil_expense /* <--- 新增 */
        FROM settlements
        WHERE user_id = ? AND strftime('%Y', settlement_time) = ?
    `;

    db.get(sql, [userId, year], (err, row) => {
        if (err) {
            console.error("查询年度总览失败:", err.message);
            return res.status(500).json({ message: "获取年度总览失败" });
        }
        res.status(200).json({
            year: parseInt(year),
            total_amount: row.yearly_total_amount || 0,
            total_amount_excluding_oil: row.yearly_total_amount_excluding_oil || 0,
            total_oil_expense: row.yearly_total_oil_expense || 0 // <--- 新增
        });
    });
});

module.exports = router;
