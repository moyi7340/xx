// xx/middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
// !! 确保这里的 JWT_SECRET 与你在 routes/auth.js 中定义的完全一致 !!
const JWT_SECRET = 'fate3238704302'; // 再次强调，请修改为你的复杂密钥

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Unauthorized - 如果没有 token
    }

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.error("Token 验证失败:", err.message);
            return res.status(403).json({ message: 'Token 无效或已过期，请重新登录。' }); // <--- 修改后的行
        }
        // 将解码后的用户信息 (payload) 附加到请求对象上，方便后续路由处理函数使用
        req.user = userPayload;
        next(); // token 有效，继续处理请求
    });
}

module.exports = authenticateToken;