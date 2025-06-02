// xx-frontend/src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 建议创建一个配置文件来管理API URL
// 例如: xx-frontend/src/config.js
// export const API_BASE_URL = 'http://localhost:8000/api';
// 然后在这里取消注释下面的行:
// import { API_BASE_URL } from '../config';
// 为了简单起见，我们暂时在这里硬编码
const API_BASE_URL = 'http://localhost:8000/api'; 

function RegistrationPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (!username || !password || !confirmPassword) {
            setError('所有字段均为必填项。');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致。');
            setLoading(false);
            return;
        }

        if (password.length < 6) { // 与后端校验一致
            setError('密码长度至少为6位。');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }), // 只发送 username 和 password
            });

            const data = await response.json();

            if (response.ok) { // HTTP 状态码在 200-299 之间 (注册成功通常是 201)
                setSuccessMessage('注册成功！即将跳转到登录页面...');
                // 清空表单 (可选)
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => {
                    navigate('/login'); // 注册成功后跳转到登录页面
                }, 2000); // 延迟2秒跳转，让用户看到成功信息
            } else {
                setError(data.message || '注册失败，请稍后再试。');
            }
        } catch (err) {
            console.error('注册 API 请求错误:', err);
            setError('发生网络错误或服务器无响应，请稍后再试。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        创建您的新账户
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="reg-username" className="sr-only">
                                用户名
                            </label>
                            <input
                                id="reg-username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                                placeholder="用户名"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-password" className="sr-only">
                                密码
                            </label>
                            <input
                                id="reg-password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                                placeholder="密码 (至少6位)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">
                                确认密码
                            </label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                                placeholder="确认密码"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center p-2 bg-red-100 rounded-md">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="text-green-600 text-sm text-center p-2 bg-green-100 rounded-md">
                            {successMessage}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    注册中...
                                </>
                            ) : '注 册'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center mt-4">
                    <Link to="/login" className="font-medium text-sky-600 hover:text-sky-500">
                        已经有账户了？去登录
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default RegistrationPage;
