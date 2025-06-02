// xx-frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // useNavigate 从这里移除，因为跳转由 App.js 控制或在 onLoginSuccess 后调用

// 建议创建一个配置文件来管理API URL
// 例如: xx-frontend/src/config.js
// export const API_BASE_URL = 'http://localhost:8000/api';
// 然后在这里取消注释下面的行:
// import { API_BASE_URL } from '../config';
// 为了简单起见，我们暂时在这里硬编码
const API_BASE_URL = 'http://localhost:8000/api'; 

// LoginPage 组件现在接收 onLoginSuccess 作为 prop
function LoginPage({ onLoginSuccess }) { 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // const navigate = useNavigate(); // 如果 onLoginSuccess 中不包含导航，则可以在这里保留 navigate

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) { // HTTP 状态码在 200-299 之间
                console.log('登录成功:', data);
                // 保存 token 到 localStorage (或其他状态管理方案)
                localStorage.setItem('authToken', data.token); 
                localStorage.setItem('userData', JSON.stringify(data.user)); // 可选：保存用户信息
                
                if (onLoginSuccess) { // <--- 调用从 App.js 传递过来的回调函数
                    onLoginSuccess();
                }
                // navigate('/'); // 跳转现在由 App.js 中的 onLoginSuccess 处理
            } else {
                setError(data.message || '登录失败，请检查您的凭据或网络连接。');
            }
        } catch (err) {
            console.error('登录 API 请求错误:', err);
            setError('发生网络错误，请稍后再试。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        登录您的账户
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <input type="hidden" name="remember" defaultValue="true" />
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="username" className="sr-only">
                                用户名
                            </label>
                            <input
                                id="username"
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
                            <label htmlFor="password-login" className="sr-only"> 
                                密码
                            </label>
                            <input
                                id="password-login" 
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                                placeholder="密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center p-2 bg-red-100 rounded-md">
                            {error}
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
                                    登录中...
                                </>
                            ) : '登 录'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center mt-4">
                    <Link to="/register" className="font-medium text-sky-600 hover:text-sky-500">
                        还没有账户？去注册
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
