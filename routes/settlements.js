// xx/routes/settlements.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const authenticateToken = require('../middleware/authenticateToken.js');
const ExcelJS = require('exceljs');

router.use(authenticateToken);

// 执行结算 (POST /api/settlements)
router.post('/', (req, res) => {
    if (!req.user || typeof req.user.userId === 'undefined') {
        console.error(`[${new Date().toISOString()}] CRITICAL ERROR in POST /api/settlements: req.user or req.user.userId is undefined.`);
        return res.status(401).json({ message: "用户认证信息无效或在结算请求中丢失。" });
    }
    const userId = req.user.userId;
    console.log(`[${new Date().toISOString()}] --- Starting POST /api/settlements for user ID: ${userId} ---`);

    db.serialize(() => {
        console.log(`[User: ${userId}] Attempting to BEGIN IMMEDIATE TRANSACTION for settlement.`);
        db.run("BEGIN IMMEDIATE TRANSACTION", (err) => {
            if (err) {
                console.error(`[User: ${userId}] FAILED to BEGIN TRANSACTION:`, err.message);
                return res.status(500).json({ message: "结算失败：无法启动数据库事务。" });
            }
            console.log(`[User: ${userId}] TRANSACTION BEGAN successfully.`);

            const findUnsettledSql = "SELECT * FROM income_entries WHERE user_id = ? AND settlement_id IS NULL";
            console.log(`[User: ${userId}] Querying for unsettled income entries.`);
            db.all(findUnsettledSql, [userId], (err, incomeEntries) => {
                if (err) {
                    console.error(`[User: ${userId}] FAILED to query unsettled income entries:`, err.message);
                    db.run("ROLLBACK", rbErr => { if (rbErr) console.error("Rollback failed:", rbErr.message); });
                    return res.status(500).json({ message: "结算失败：查询未结算收入出错。" });
                }
                console.log(`[User: ${userId}] Found ${incomeEntries.length} unsettled income entries.`);

                if (incomeEntries.length === 0) {
                    console.log(`[User: ${userId}] No unsettled entries found. Rolling back transaction.`);
                    db.run("ROLLBACK", rbErr => { if (rbErr) console.error("Rollback failed:", rbErr.message); });
                    return res.status(400).json({ message: "没有需要结算的收入记录" });
                }

                let totalAmount = 0;
                let totalAmountExcludingOil = 0;
                let totalOilExpense = 0; 
                const entryIds = [];

                incomeEntries.forEach(entry => {
                    totalAmount += entry.amount;
                    // 修改判断条件：如果目的地是 "油"，则计入油费
                    if (entry.destination === '油') { 
                        totalOilExpense += entry.amount;
                    } else {
                        // 如果不是油费，则计入不含油总额
                        // 注意：如果目的地是“油”也被视为一种“收入”，那么 totalAmountExcludingOil 的计算逻辑可能需要调整
                        // 假设目的地为“油”的条目纯粹是油费支出，不计入“不含油总额”
                        // 如果目的地为“油”的条目本身也是一种收入（比如公司报销油费），这里的逻辑就需要明确
                        // 当前的 totalAmountExcludingOil 逻辑是：只要不是油费（按新标准判断），就加入。
                        // 这意味着如果一条记录的 destination 是 '油'，它不会被加到 totalAmountExcludingOil。
                        // 而 totalAmount 包含了所有金额。
                        // 所以 totalAmount = totalAmountExcludingOil (非油目的地金额) + totalOilExpense (油目的地金额)。 这是合理的。
                        totalAmountExcludingOil += entry.amount; 
                    }
                    entryIds.push(entry.id);
                });
                
                // 为了确保 totalAmountExcludingOil 正确性，如果 totalOilExpense 是从 destination === '油' 计算的，
                // 那么 totalAmountExcludingOil 应该是 totalAmount - totalOilExpense。
                // 让我们重新梳理一下不含油总额的计算：
                totalAmountExcludingOil = 0; // 先清零
                incomeEntries.forEach(entry => {
                    if (entry.destination !== '油') { // 只要目的地不是“油”，就计入不含油总额
                        totalAmountExcludingOil += entry.amount;
                    }
                });


                console.log(`[User: ${userId}] Calculated totals: TotalAmount=${totalAmount}, TotalExcludingOil=${totalAmountExcludingOil}, TotalOilExpense=${totalOilExpense}`);

                const insertSettlementSql = `
                    INSERT INTO settlements (user_id, settlement_time, total_amount, total_amount_excluding_oil, total_oil_expense) 
                    VALUES (?, datetime('now', 'localtime'), ?, ?, ?)
                `;
                console.log(`[User: ${userId}] Inserting new settlement record.`);
                db.run(insertSettlementSql, [userId, totalAmount, totalAmountExcludingOil, totalOilExpense], function(err) {
                    if (err) {
                        console.error(`[User: ${userId}] FAILED to insert new settlement record:`, err.message);
                        db.run("ROLLBACK", rbErr => { if (rbErr) console.error("Rollback failed:", rbErr.message); });
                        return res.status(500).json({ message: "结算失败：创建结算记录出错。" });
                    }

                    const settlementId = this.lastID;
                    console.log(`[User: ${userId}] New settlement record created with ID: ${settlementId}.`);
                    const placeholders = entryIds.map(() => '?').join(',');
                    const updateEntriesSql = `
                        UPDATE income_entries
                        SET settlement_id = ?, updated_at = datetime('now', 'localtime')
                        WHERE id IN (${placeholders}) AND user_id = ?
                    `;
                    console.log(`[User: ${userId}] Updating ${entryIds.length} income entries with settlement ID: ${settlementId}.`);
                    db.run(updateEntriesSql, [settlementId, ...entryIds, userId], function(err) {
                        if (err) {
                            console.error(`[User: ${userId}] FAILED to update income entries with settlement ID:`, err.message);
                            db.run("ROLLBACK", rbErr => { if (rbErr) console.error("Rollback failed:", rbErr.message); });
                            return res.status(500).json({ message: "结算失败：更新收入条目出错。" });
                        }
                        console.log(`[User: ${userId}] Successfully updated income entries. Attempting to COMMIT transaction.`);

                        db.run("COMMIT", (err) => {
                            if (err) {
                                console.error(`[User: ${userId}] FAILED to COMMIT transaction:`, err.message);
                                return res.status(500).json({ message: "结算处理完成，但最终确认时出错。" });
                            }
                            console.log(`[User: ${userId}] TRANSACTION COMMITTED successfully for settlement ID: ${settlementId}.`);
                            console.log(`[${new Date().toISOString()}] --- Finished POST /api/settlements for user ID: ${userId} ---`);
                            return res.status(201).json({ 
                                message: "结算成功",
                                settlementId: settlementId,
                                totalAmount: totalAmount,
                                totalAmountExcludingOil: totalAmountExcludingOil,
                                totalOilExpense: totalOilExpense, 
                                settledEntriesCount: incomeEntries.length
                            });
                        });
                    });
                });
            });
        });
    });
});

// ... (GET /, GET /:id, DELETE /:id, GET /:id/export 路由保持不变) ...
// (确保这些路由中如果也自己计算或显示油费相关的，也基于新逻辑或依赖于settlements表中的total_oil_expense)
// 例如，GET /:id 和 GET /:id/export 已经从 settlements 表读取 total_oil_expense，所以它们不需要修改。
// GET / (获取结算列表) 也已经从 settlements 表读取 total_oil_expense。

// (此处省略其他路由的完整代码以保持简洁，请确保您本地文件是完整的)
// 获取当前用户的所有结算历史记录 (GET /api/settlements)
router.get('/', (req, res) => {
    if (!req.user || typeof req.user.userId === 'undefined') {
        return res.status(401).json({ message: "用户认证信息无效" });
    }
    const userId = req.user.userId;
    const sql = "SELECT id, user_id, settlement_time, total_amount, total_amount_excluding_oil, total_oil_expense, created_at FROM settlements WHERE user_id = ? ORDER BY settlement_time DESC"; 

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "获取结算列表失败" });
        }
        res.status(200).json(rows);
    });
});

// 获取单个结算记录的详细信息 (GET /api/settlements/:id)
router.get('/:id', (req, res) => {
    if (!req.user || typeof req.user.userId === 'undefined') {
        return res.status(401).json({ message: "用户认证信息无效" });
    }
    const settlementId = req.params.id;
    const userId = req.user.userId;

    const settlementSql = "SELECT id, user_id, settlement_time, total_amount, total_amount_excluding_oil, total_oil_expense, created_at FROM settlements WHERE id = ? AND user_id = ?"; 
    db.get(settlementSql, [settlementId, userId], (err, settlement) => {
        if (err) {
            return res.status(500).json({ message: "获取结算详情失败" });
        }
        if (!settlement) {
            return res.status(404).json({ message: "未找到指定的结算记录或无权访问" });
        }
        const entriesSql = "SELECT * FROM income_entries WHERE settlement_id = ? AND user_id = ? ORDER BY entry_date ASC";
        db.all(entriesSql, [settlementId, userId], (err, entries) => {
            if (err) {
                return res.status(500).json({ message: "获取结算详情失败 (查询收入条目出错)" });
            }
            res.status(200).json({
                settlementDetails: settlement,
                incomeEntries: entries
            });
        });
    });
});

// 删除结算记录 (DELETE /api/settlements/:id)
router.delete('/:id', (req, res) => {
    if (!req.user || typeof req.user.userId === 'undefined') {
        return res.status(401).json({ message: "用户认证信息无效" });
    }
    const settlementId = req.params.id;
    const userId = req.user.userId;
    const checkSql = "SELECT id FROM settlements WHERE id = ? AND user_id = ?";
    db.get(checkSql, [settlementId, userId], (err, row) => {
        if (err) { return res.status(500).json({ message: "服务器内部错误" }); }
        if (!row) { return res.status(404).json({ message: "未找到要删除的结算记录" }); }
        const deleteSql = "DELETE FROM settlements WHERE id = ? AND user_id = ?";
        db.run(deleteSql, [settlementId, userId], function(err) {
            if (err) { return res.status(500).json({ message: "删除失败" }); }
            if (this.changes === 0) { return res.status(404).json({ message: "未找到要删除的结算记录" });}
            res.status(200).json({ message: "结算记录删除成功, 相关收入条目已恢复为未结算状态", id: settlementId });
        });
    });
});

// 导出单个结算记录的详细信息为 Excel (GET /api/settlements/:id/export)
router.get('/:id/export', async (req, res) => {
    if (!req.user || typeof req.user.userId === 'undefined') {
        return res.status(401).json({ message: "用户认证信息无效" });
    }
    const settlementId = req.params.id;
    const userId = req.user.userId;
    try {
        const settlementSql = "SELECT id, user_id, settlement_time, total_amount, total_amount_excluding_oil, total_oil_expense, created_at FROM settlements WHERE id = ? AND user_id = ?"; 
        const settlement = await new Promise((resolve, reject) => {
            db.get(settlementSql, [settlementId, userId], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!settlement) { return res.status(404).json({ message: "未找到指定的结算记录" });}
        const entriesSql = "SELECT * FROM income_entries WHERE settlement_id = ? AND user_id = ? ORDER BY entry_date ASC";
        const incomeEntries = await new Promise((resolve, reject) => {
            db.all(entriesSql, [settlementId, userId], (err, rows) => err ? reject(err) : resolve(rows));
        });
        const workbook = new ExcelJS.Workbook(); 
        workbook.creator = 'Income Tracker App';
        const sheet = workbook.addWorksheet(`结算详情 ${settlementId}`);
        sheet.addRow(['结算ID:', settlement.id]);
        sheet.addRow(['结算时间:', new Date(settlement.settlement_time).toLocaleString([], {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) ]);
        sheet.addRow(['总金额:', settlement.total_amount]);
        sheet.addRow(['不含油总金额:', settlement.total_amount_excluding_oil]);
        sheet.addRow(['总油费:', settlement.total_oil_expense || 0]); 
        sheet.addRow([]);
        sheet.addRow(['收入条目详情:']);
        const headerRow = sheet.addRow(['条目ID', '日期', '目的地', '自定义目的地', '金额', '是否油费', '创建时间']);
        headerRow.eachCell((cell) => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
        incomeEntries.forEach(entry => {
            sheet.addRow([entry.id, entry.entry_date, entry.destination, entry.custom_destination || '-', entry.amount, entry.is_oil_expense ? '是' : '否', new Date(entry.created_at).toLocaleString([], {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })]);
        });
        sheet.columns.forEach(column => { let maxLength = 0; column.eachCell({ includeEmpty: true }, cell => { let len = cell.value ? cell.value.toString().length : 10; if (len > maxLength) maxLength = len; }); column.width = maxLength < 12 ? 12 : maxLength + 2; });
        sheet.getColumn(2).width = 20; sheet.getColumn(7).width = 20;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="settlement_${settlementId}_details_${new Date().toISOString().slice(0,10)}.xlsx"`);
        await workbook.xlsx.write(res);
    } catch (error) {
        console.error("导出Excel失败:", error);
        if (!res.headersSent) res.status(500).json({ message: "导出Excel失败" });
    }
});
module.exports = router;
