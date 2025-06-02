// xx/server.js

// 引入必要的模块
const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const authRoutes = require('./routes/auth.js');
const incomeRoutes = require('./routes/income.js');
const settlementRoutes = require('./routes/settlements.js');
const summaryRoutes = require('./routes/summary.js');
const adminRoutes = require('./routes/admin.js'); // <--- 新增：引入管理员路由

// 创建 Express 应用实例
const app = express();

// 定义服务器端口
const PORT = process.env.PORT || 8000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路由
app.get('/', (req, res) => {
    res.json({ message: '欢迎来到收入总结网站后端 API! (项目 xx - v2)' });
});

// API 路由配置
app.use('/api/auth', authRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/admin', adminRoutes); // <--- 新增：使用管理员路由

// 统一的错误处理中间件
app.use((err, req, res, next) => {
    console.error("服务器错误:", err.stack);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || '服务器发生了一些内部错误，请稍后再试。',
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`项目 "xx" 的后端服务器正在运行于 http://localhost:${PORT}`);
});
