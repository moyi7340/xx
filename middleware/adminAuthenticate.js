// xx/middleware/adminAuthenticate.js

function adminAuthenticate(req, res, next) {
    // 我们假设 authenticateToken 中间件已经成功执行，
    // 并且将包含 isAdmin 属性的解码后的用户信息 (payload) 附加到了 req.user 对象上。
    // 在 routes/auth.js 的登录逻辑中，payload 应该包含 isAdmin: user.is_admin === 1
    
    if (req.user && req.user.isAdmin === true) {
        // 如果 req.user存在 且 isAdmin 为 true，则用户是管理员
        next(); // 允许请求继续到下一个处理函数 (即管理员路由中的具体操作)
    } else {
        // 如果用户不是管理员，或者 req.user.isAdmin 不是 true
        res.status(403).json({ message: '权限不足，此操作需要管理员权限' }); // 403 Forbidden
    }
}

module.exports = adminAuthenticate;
