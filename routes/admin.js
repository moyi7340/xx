// xx/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken.js');
const adminAuthenticate = require('../middleware/adminAuthenticate.js');
const fs = require('fs'); 
const path = require('path'); 

router.use(authenticateToken, adminAuthenticate);

const DBLivePath = path.join(__dirname, '..', 'db.sqlite'); 
const BackupsDir = path.join(__dirname, '..', 'backups');   

function ensureBackupsDirExists() {
    if (!fs.existsSync(BackupsDir)) {
        try {
            fs.mkdirSync(BackupsDir, { recursive: true });
            console.log(`[Admin] Backups directory created at: ${BackupsDir}`);
        } catch (err) {
            console.error(`[Admin] Error creating backups directory at ${BackupsDir}:`, err);
        }
    }
}

// 管理员获取所有用户列表 (GET /api/admin/users)
router.get('/users', (req, res) => {
    console.log(`[Admin SYS] Admin user ID: ${req.user.userId} is requesting list of all users.`);
    const sql = "SELECT id, username, is_admin, created_at FROM users ORDER BY id ASC";
    
    db.all(sql, [], (err, users) => {
        if (err) {
            console.error('[Admin SYS] Failed to fetch user list:', err.message);
            return res.status(500).json({ message: '获取用户列表失败。' });
        }
        res.status(200).json(users);
    });
});

// 管理员修改指定用户的密码 (PUT /api/admin/users/:userId/change-password)
router.put('/users/:userId/change-password', async (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10); // 确保是数字
    const { newPassword } = req.body;
    console.log(`[Admin SYS] Admin user ID: ${req.user.userId} is attempting to change password for user ID: ${targetUserId}.`);

    if (targetUserId === req.user.userId) {
        return res.status(400).json({ message: '管理员不能通过此接口修改自己的密码，请使用普通用户修改密码功能。' });
    }
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: '新密码不能为空且长度至少为6位' });
    }
    try {
        const userCheckSql = "SELECT id FROM users WHERE id = ?";
        const targetUser = await new Promise((resolve, reject) => {
            db.get(userCheckSql, [targetUserId], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!targetUser) {
            return res.status(404).json({ message: '未找到指定的用户' });
        }
        const salt = bcrypt.genSaltSync(10);
        const newPasswordHash = bcrypt.hashSync(newPassword, salt);
        const updateSql = "UPDATE users SET password_hash = ? WHERE id = ?";
        await new Promise((resolve, reject) => {
            db.run(updateSql, [newPasswordHash, targetUserId], function(err) { err ? reject(err) : resolve(this); });
        });
        console.log(`[Admin SYS] Password for user ID: ${targetUserId} changed successfully by admin ID: ${req.user.userId}.`);
        res.status(200).json({ message: `用户 ID ${targetUserId} 的密码修改成功` });
    } catch (error) {
        console.error(`[Admin SYS] Failed to change password for user ID: ${targetUserId} by admin ID: ${req.user.userId}. Error:`, error.message);
        res.status(500).json({ message: '操作失败，请稍后再试' });
    }
});

// 管理员删除指定用户及其所有数据 (DELETE /api/admin/users/:userId)
router.delete('/users/:userId', (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10); // 确保是数字
    const adminUserId = req.user.userId;

    console.log(`[Admin SYS] Admin user ID: ${adminUserId} is attempting to DELETE user ID: ${targetUserId} and all their data.`);

    if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "无效的用户ID格式。" });
    }

    // 防止管理员删除自己
    if (targetUserId === adminUserId) {
        console.warn(`[Admin SYS] Admin user ID: ${adminUserId} attempted to delete themselves. Operation denied.`);
        return res.status(403).json({ message: "管理员不能删除自己的账户。" });
    }
    
    // 检查默认管理员账户是否被删除 (可选，但建议保留默认管理员)
    // 假设默认管理员ID为1，或者用户名为'yongliang'
    db.get("SELECT username, is_admin FROM users WHERE id = ?", [targetUserId], (err, userToDelete) => {
        if (err) {
            console.error(`[Admin SYS] Error fetching user ${targetUserId} for deletion check:`, err.message);
            return res.status(500).json({ message: "检查用户信息时出错。" });
        }
        if (!userToDelete) {
            return res.status(404).json({ message: "目标用户不存在。" });
        }
        // 示例：如果默认管理员用户名为 'yongliang' 且 is_admin 为 1，则不允许删除
        if (userToDelete.username === 'yongliang' && userToDelete.is_admin === 1) {
            console.warn(`[Admin SYS] Attempt to delete THE default admin account ('yongliang') by admin ID: ${adminUserId}. Operation denied.`);
            return res.status(403).json({ message: "不能删除默认的超级管理员账户。" });
        }


        db.serialize(() => {
            db.run("BEGIN TRANSACTION", (err) => {
                if (err) {
                    console.error(`[Admin SYS] Failed to begin transaction for deleting user ${targetUserId}:`, err.message);
                    return res.status(500).json({ message: "删除用户操作失败 (事务错误)。" });
                }

                let operationsFailed = false;
                let lastErrorMessage = '';

                // 1. 删除该用户的所有结算记录
                db.run("DELETE FROM settlements WHERE user_id = ?", [targetUserId], function(err) {
                    if (err) {
                        operationsFailed = true;
                        lastErrorMessage = "删除用户的结算记录失败。";
                        console.error(`[Admin SYS] Failed to delete settlements for user ${targetUserId}:`, err.message);
                        db.run("ROLLBACK");
                        return res.status(500).json({ message: lastErrorMessage });
                    }
                    console.log(`[Admin SYS] Deleted ${this.changes} settlements for user ${targetUserId}.`);

                    // 2. 删除该用户的所有收入条目
                    db.run("DELETE FROM income_entries WHERE user_id = ?", [targetUserId], function(err) {
                        if (err) {
                            operationsFailed = true;
                            lastErrorMessage = "删除用户的收入记录失败。";
                            console.error(`[Admin SYS] Failed to delete income_entries for user ${targetUserId}:`, err.message);
                            db.run("ROLLBACK");
                            return res.status(500).json({ message: lastErrorMessage });
                        }
                        console.log(`[Admin SYS] Deleted ${this.changes} income entries for user ${targetUserId}.`);

                        // 3. 删除用户本身
                        db.run("DELETE FROM users WHERE id = ?", [targetUserId], function(err) {
                            if (err) {
                                operationsFailed = true;
                                lastErrorMessage = "删除用户账户失败。";
                                console.error(`[Admin SYS] Failed to delete user ${targetUserId} from users table:`, err.message);
                                db.run("ROLLBACK");
                                return res.status(500).json({ message: lastErrorMessage });
                            }
                            if (this.changes === 0) { // 用户不存在或已被删除
                                operationsFailed = true;
                                lastErrorMessage = "用户不存在或已被删除。";
                                console.warn(`[Admin SYS] Attempted to delete user ${targetUserId}, but user was not found in users table (0 changes).`);
                                db.run("ROLLBACK");
                                return res.status(404).json({ message: lastErrorMessage });
                            }
                            console.log(`[Admin SYS] Deleted user ${targetUserId} from users table.`);

                            // 4. 提交事务
                            db.run("COMMIT", (err) => {
                                if (err) {
                                    operationsFailed = true;
                                    lastErrorMessage = "提交删除操作失败。";
                                    console.error(`[Admin SYS] Failed to commit transaction for deleting user ${targetUserId}:`, err.message);
                                    // 尝试回滚，尽管COMMIT失败时SQLite通常会自动回滚
                                    db.run("ROLLBACK"); 
                                    return res.status(500).json({ message: lastErrorMessage });
                                }
                                console.log(`[Admin SYS] Successfully deleted user ID: ${targetUserId} and all associated data. Committed by admin ID: ${adminUserId}.`);
                                res.status(200).json({ message: `用户 ID ${targetUserId} 及其所有数据已成功删除。` });
                            });
                        });
                    });
                });
            });
        });
    });
});


// 管理员查看特定用户收入统计 (GET /api/admin/users/:userId/income-summary)
router.get('/users/:userId/income-summary', (req, res) => {
    // ... (代码保持不变)
    const targetUserId = parseInt(req.params.userId, 10);
    const adminUserId = req.user.userId;
    const { periodType, year, month, week } = req.query;
    console.log(`[Admin SYS] Admin ID: ${adminUserId} requesting income summary for user ID: ${targetUserId}. Period: ${periodType}, Year: ${year}, Month: ${month}, Week: ${week}`);
    if (isNaN(targetUserId)) { return res.status(400).json({ message: "无效的用户ID格式。" }); }
    if (!periodType || !['yearly', 'monthly', 'weekly'].includes(periodType)) { return res.status(400).json({ message: "必须提供有效的 periodType (yearly, monthly, weekly)。" });}
    if (!year || isNaN(parseInt(year, 10))) { return res.status(400).json({ message: "必须提供有效的年份 (year)。" });}
    let sql; let params = [targetUserId]; const responsePayload = { userId: targetUserId, periodType: periodType, year: parseInt(year, 10),};
    switch (periodType) {
        case 'yearly':
            sql = `SELECT SUM(total_amount) as period_total_amount, SUM(total_amount_excluding_oil) as period_total_amount_excluding_oil, SUM(total_oil_expense) as period_total_oil_expense FROM settlements WHERE user_id = ? AND strftime('%Y', settlement_time) = ?`;
            params.push(year.toString());
            break;
        case 'monthly':
            if (!month || isNaN(parseInt(month, 10)) || parseInt(month, 10) < 1 || parseInt(month, 10) > 12) { return res.status(400).json({ message: "对于月度统计，必须提供有效的月份 (month, 1-12)。" });}
            const formattedMonth = month.toString().padStart(2, '0');
            sql = `SELECT SUM(total_amount) as period_total_amount, SUM(total_amount_excluding_oil) as period_total_amount_excluding_oil, SUM(total_oil_expense) as period_total_oil_expense FROM settlements WHERE user_id = ? AND strftime('%Y-%m', settlement_time) = ?`;
            params.push(`${year}-${formattedMonth}`); responsePayload.month = parseInt(month, 10);
            break;
        case 'weekly':
            if (!week || isNaN(parseInt(week, 10)) || parseInt(week, 10) < 0 || parseInt(week, 10) > 53) { return res.status(400).json({ message: "对于周度统计，必须提供有效的周数 (week, 0-53)。" });}
            const formattedWeek = week.toString().padStart(2, '0');
            sql = `SELECT SUM(total_amount) as period_total_amount, SUM(total_amount_excluding_oil) as period_total_amount_excluding_oil, SUM(total_oil_expense) as period_total_oil_expense FROM settlements WHERE user_id = ? AND strftime('%Y', settlement_time) = ? AND strftime('%W', settlement_time) = ?`;
            params.push(year.toString()); params.push(formattedWeek); responsePayload.week = parseInt(week, 10);
            break;
        default: return res.status(400).json({ message: "无效的 periodType。" });
    }
    db.get(sql, params, (err, row) => {
        if (err) { console.error(`[Admin SYS] Failed to fetch income summary for user ID: ${targetUserId}. Error:`, err.message); return res.status(500).json({ message: '获取用户收入统计失败。' });}
        responsePayload.total_income = row.period_total_amount || 0;
        responsePayload.total_income_excluding_oil = row.period_total_amount_excluding_oil || 0;
        responsePayload.total_oil_expense = row.period_total_oil_expense || 0;
        console.log(`[Admin SYS] Successfully fetched income summary for user ID: ${targetUserId}. Result:`, responsePayload);
        res.status(200).json(responsePayload);
    });
});

// 手动备份数据库文件到服务器 (POST /api/admin/backup-database)
router.post('/backup-database', (req, res) => {
    // ... (代码保持不变)
    ensureBackupsDirExists(); 
    console.log(`[Admin SYS] Admin user ID: ${req.user.userId} is requesting database backup.`);
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const backupFilename = `backup_db_${timestamp}.sqlite`;
    const backupFilePath = path.join(BackupsDir, backupFilename);
    if (!fs.existsSync(DBLivePath)) {
        console.error('[Admin SYS] Source database file not found at:', DBLivePath);
        return res.status(500).json({ message: '数据库文件未找到，无法备份。' });
    }
    fs.copyFile(DBLivePath, backupFilePath, (err) => {
        if (err) {
            console.error('[Admin SYS] Failed to copy database file for backup:', err.message);
            return res.status(500).json({ message: '创建数据库备份文件失败。' });
        }
        console.log(`[Admin SYS] Database backup successful: ${backupFilePath} by admin ID: ${req.user.userId}.`);
        res.status(200).json({
            message: '数据库备份成功！',
            backupFilename: backupFilename,
            backupPathOnServer: backupFilePath 
        });
    });
});

// 列出所有可用的备份文件 (GET /api/admin/backups)
router.get('/backups', (req, res) => {
    // ... (代码保持不变)
    ensureBackupsDirExists();
    console.log(`[Admin SYS] Admin user ID: ${req.user.userId} is requesting list of backups.`);
    fs.readdir(BackupsDir, (err, files) => {
        if (err) {
            console.error('[Admin SYS] Failed to read backups directory:', err.message);
            return res.status(500).json({ message: '无法读取备份列表。' });
        }
        const backupFiles = files
            .filter(file => file.startsWith('backup_db_') && file.endsWith('.sqlite'))
            .map(file => {
                const filePath = path.join(BackupsDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    return { filename: file, size: stats.size, modified_time: stats.mtime };
                } catch (statErr) {
                    console.error(`[Admin SYS] Error getting stats for backup file ${file}:`, statErr.message);
                    return { filename: file, size: null, modified_time: null }; 
                }
            })
            .sort((a, b) => new Date(b.modified_time) - new Date(a.modified_time));
        res.status(200).json(backupFiles);
    });
});

// 从服务器上的备份文件恢复数据库 (POST /api/admin/restore-database)
router.post('/restore-database', (req, res) => {
    // ... (代码保持不变)
    ensureBackupsDirExists();
    const { filename } = req.body;
    console.log(`[Admin SYS] Admin user ID: ${req.user.userId} is requesting database restore from file: ${filename}.`);
    if (!filename) {
        return res.status(400).json({ message: '必须提供要恢复的备份文件名。' });
    }
    const backupFilePath = path.join(BackupsDir, filename);
    if (!fs.existsSync(backupFilePath)) {
        console.error('[Admin SYS] Backup file not found for restore:', backupFilePath);
        return res.status(404).json({ message: `备份文件 '${filename}' 未找到。` });
    }
    if (!fs.existsSync(DBLivePath)) {
        console.warn('[Admin SYS] Live database file not found at:', DBLivePath, 'A new one will be created by the restore.');
    }
    console.warn(`[Admin SYS] CRITICAL: About to overwrite live database ${DBLivePath} with backup ${backupFilePath}. Requested by admin ID: ${req.user.userId}.`);
    fs.copyFile(backupFilePath, DBLivePath, (err) => {
        if (err) {
            console.error('[Admin SYS] Failed to copy backup file to live database path during restore:', err.message);
            return res.status(500).json({ message: '恢复数据库失败。' });
        }
        console.log(`[Admin SYS] Database successfully restored from ${filename} by admin ID: ${req.user.userId}. SERVER RESTART IS STRONGLY RECOMMENDED.`);
        res.status(200).json({
            message: `数据库已成功从 '${filename}' 恢复。强烈建议您现在重启应用服务器！`
        });
    });
});

module.exports = router;
