// xx-frontend/src/components/ChangePasswordForm.js
import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api'; // 之后应从配置文件导入

// ChangePasswordForm 组件现在接收 onCloseModal 作为 prop
function ChangePasswordForm({ onCloseModal }) { 
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError('所有密码字段均为必填项。');
            setLoading(false);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('新密码和确认新密码不一致。');
            setLoading(false);
            return;
        }
        if (newPassword.length < 6) {
            setError('新密码长度至少为6位。');
            setLoading(false);
            return;
        }
        if (currentPassword === newPassword) {
            setError('新密码不能与当前密码相同。');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('用户未认证，请重新登录后再尝试修改密码。');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('密码修改成功！弹窗将在几秒后关闭。');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setTimeout(() => {
                    if (onCloseModal) { // <--- 如果 onCloseModal prop 存在，则调用它
                        onCloseModal();
                    }
                    setSuccessMessage(''); // 清除成功消息，避免下次打开弹窗时还显示
                }, 2500); // 延迟2.5秒关闭弹窗，让用户看到成功信息
            } else {
                setError(data.message || '密码修改失败，请重试。');
                 setTimeout(() => { // 几秒后清除错误消息
                    setError('');
                }, 5000);
            }
        } catch (err) {
            console.error('修改密码 API 请求错误:', err);
            setError('发生网络错误或服务器无响应，请稍后再试。');
            setTimeout(() => { // 几秒后清除错误消息
                setError('');
            }, 5000);
        } finally {
            setLoading(false); 
            // 不再在这里清除消息，因为成功或失败后有单独的延时清除
        }
    };

    return (
        <div className="bg-white rounded-lg pt-2 pb-6 px-6 sm:pt-0"> {/* 调整内边距以适应弹窗 */}
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">修改您的密码</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="currentPassword-modal" className="block text-sm font-medium text-gray-700">当前密码:</label>
                    <input 
                        type="password" 
                        id="currentPassword-modal" // 确保ID在整个应用中唯一，特别是在弹窗内
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        disabled={loading}
                    />
                </div>
                <div>
                    <label htmlFor="newPassword-modal" className="block text-sm font-medium text-gray-700">新密码 (至少6位):</label>
                    <input 
                        type="password" 
                        id="newPassword-modal" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        disabled={loading}
                    />
                </div>
                <div>
                    <label htmlFor="confirmNewPassword-modal" className="block text-sm font-medium text-gray-700">确认新密码:</label>
                    <input 
                        type="password" 
                        id="confirmNewPassword-modal" 
                        value={confirmNewPassword} 
                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        disabled={loading}
                    />
                </div>

                {error && <p className="text-red-500 text-sm italic text-center py-2">{error}</p>}
                {successMessage && <p className="text-green-600 text-sm italic text-center py-2">{successMessage}</p>}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                >
                    {loading ? '正在修改...' : '确认修改密码'}
                </button>
            </form>
        </div>
    );
}

export default ChangePasswordForm;
