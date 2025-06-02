// xx-frontend/src/components/admin/AdminUserList.js
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL_ADMIN = 'http://localhost:8000/api/admin';

const cardTextColor = "text-slate-700 dark:text-slate-200";
const cardTitleColor = "text-purple-700 dark:text-purple-300";
const cardMutedTextColor = "text-slate-500 dark:text-slate-400";
const highlightColor = "text-purple-600 dark:text-purple-400";
const deleteButtonTextColor = "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300";
const modalStrongText = "text-gray-900 dark:text-gray-100";
const modalMutedText = "text-gray-600 dark:text-gray-300";
const modalTitleColor = "text-gray-800 dark:text-gray-100"; 
const modalHighlightColor = "text-purple-600 dark:text-purple-400"; 
const modalContentClasses = "bg-white dark:bg-slate-800 shadow-xl rounded-lg p-6 border border-gray-300 dark:border-slate-700 w-full max-w-md";


function AdminChangeUserPasswordModal({ userId, username, onClose, onPasswordChanged }) {
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            setError('新密码不能为空且长度至少为6位。');
            return;
        }
        setLoading(true); setError(''); setSuccess('');
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/users/${userId}/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ newPassword }),
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess(`用户 ${username} (ID: ${userId}) 的密码已成功修改。`);
                setNewPassword(''); 
                if(onPasswordChanged) onPasswordChanged();
                setTimeout(onClose, 2000); 
            } else { setError(data.message || '修改密码失败。'); }
        } catch (err) { setError('网络错误，修改密码失败。'); } 
        finally { setLoading(false); }
    };

    return (
        <div className={`${modalContentClasses}`}>
            <h3 className={`text-lg font-semibold mb-4 ${modalTitleColor}`}>为用户 "{username}" (ID: {userId}) 修改密码</h3>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor={`admin-new-password-${userId}`} className={`block text-sm font-medium mb-1 ${modalStrongText}`}>新密码 (至少6位):</label>
                    <input
                        type="password"
                        id={`admin-new-password-${userId}`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-700 ${modalStrongText}`}
                        required
                        disabled={loading}
                    />
                </div>
                {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
                {success && <p className="text-green-500 text-xs mb-3">{success}</p>}
                <div className="flex justify-end space-x-3">
                    <button type="button" onClick={onClose} disabled={loading} className={`px-4 py-2 text-sm rounded-md ${modalMutedText} bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500`}>
                        取消
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
                        {loading ? '保存中...' : '确认修改'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function AdminDeleteUserConfirmModal({ user, onClose, onConfirmDelete }) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const expectedConfirmText = "Delete";

    const handleConfirm = async () => {
        if (confirmText !== expectedConfirmText) {
            setError(`请输入 "${expectedConfirmText}" 来确认删除。`);
            return;
        }
        setLoading(true);
        setError('');
        await onConfirmDelete(user.id); 
        setLoading(false);
    };

    return (
        <div className={`${modalContentClasses}`}>
            <h3 className={`text-lg font-semibold mb-2 text-red-600 dark:text-red-400`}>确认删除用户</h3>
            <p className={`mb-4 text-sm ${modalMutedText}`}> 
                您确定要永久删除用户 <strong className={modalHighlightColor}>{user.username}</strong> (ID: {user.id}) 吗？
                此操作将删除该用户的所有数据（收入、结算等），且无法恢复！
            </p>
            <div className="mb-4">
                <label htmlFor={`delete-confirm-input-${user.id}`} className={`block text-sm font-medium mb-1 ${modalStrongText}`}>
                    请输入 "<span className="font-bold text-red-500">{expectedConfirmText}</span>" 来确认:
                </label>
                <input
                    type="text"
                    id={`delete-confirm-input-${user.id}`}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className={`w-full px-3 py-2 border ${confirmText !== expectedConfirmText && confirmText.length > 0 ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-slate-700 ${modalStrongText}`}
                />
            </div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <div className="flex justify-end space-x-3">
                <button type="button" onClick={onClose} disabled={loading} className={`px-4 py-2 text-sm rounded-md ${modalMutedText} bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500`}>
                    取消
                </button>
                <button 
                    onClick={handleConfirm} 
                    disabled={loading || confirmText !== expectedConfirmText} 
                    className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '删除中...' : '确认删除'}
                </button>
            </div>
        </div>
    );
}

// AdminUserList 现在接收 onShowUserSummary prop
function AdminUserList({ onShowUserSummary }) { 
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionStatus, setActionStatus] = useState({ message: '', type: ''});
    
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState(null);

    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false); 
    const [userToDelete, setUserToDelete] = useState(null); 


    const fetchUsers = useCallback(async () => {
        setLoading(true); setError(''); setActionStatus({message: '', type:''});
        const token = localStorage.getItem('authToken');
        if (!token) { setError('管理员未认证。'); setLoading(false); return; }
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/users`, { headers: { 'Authorization': `Bearer ${token}` }});
            const data = await response.json();
            if (response.ok) { setUsers(data); } 
            else { setError(data.message || '获取用户列表失败。'); }
        } catch (err) { setError('网络错误，无法获取用户列表。'); } 
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openPasswordModal = (user) => { setSelectedUserForPasswordChange(user); setShowPasswordModal(true); };
    const closePasswordModal = () => { setShowPasswordModal(false); setSelectedUserForPasswordChange(null); };
    
    const openDeleteUserModal = (user) => { setUserToDelete(user); setShowDeleteUserModal(true); };
    const closeDeleteUserModal = () => { 
        setShowDeleteUserModal(false); 
        setUserToDelete(null); 
    };

    const confirmDeleteUser = async (userId) => {
        const token = localStorage.getItem('authToken');
        setActionStatus({message: '', type: ''});
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setActionStatus({message: data.message || `用户 ID ${userId} 已成功删除。`, type: 'success'});
                fetchUsers(); 
                closeDeleteUserModal(); 
            } else {
                setActionStatus({message: data.message || '删除用户失败。', type: 'error'});
            }
        } catch (err) {
            setActionStatus({message: '网络错误，删除用户失败。', type: 'error'});
        }
        setTimeout(() => setActionStatus({message: '', type: ''}), 5000);
    };
    
    const handleViewSummaryClick = (user) => {
        if (onShowUserSummary) {
            onShowUserSummary(user.id, user.username); // 传递用户ID和用户名
        }
    };

    if (loading && users.length === 0) { 
        return <p className={`${cardTextColor} text-center py-4`}>正在加载用户列表...</p>;
    }
    if (error && users.length === 0) { 
        return <p className={`text-red-500 dark:text-red-400 text-center py-4`}>错误: {error}</p>;
    }

    return (
        <div className="mt-0"> 
            <div className="flex justify-between items-center mb-3">
                <h4 className={`text-md font-semibold ${cardTitleColor}`}>用户列表 ({users.length})</h4>
                <button onClick={fetchUsers} className={`text-xs ${highlightColor} hover:underline disabled:opacity-50`} disabled={loading}>
                    {loading ? '刷新中...' : '刷新列表'}
                </button>
            </div>

            {actionStatus.message && (
                <p className={`text-xs mb-3 p-2 rounded-md ${actionStatus.type === 'success' ? 'bg-green-100/50 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100/50 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                    {actionStatus.message}
                </p>
            )}
            {error && users.length > 0 && <p className={`text-red-500 dark:text-red-400 text-xs mb-2`}>获取用户列表时出错: {error}</p>}
            
            {users.length === 0 && !loading && (
                <p className={`${cardMutedTextColor} py-3 text-center`}>没有找到用户。</p>
            )}

            {users.length > 0 && (
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-purple-200/30 dark:divide-purple-700/30 ${cardTextColor}`}>
                        <thead className="bg-purple-500/5 dark:bg-purple-800/10">
                            <tr>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>ID</th>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>用户名</th>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>管理员?</th>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>注册时间</th>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>操作</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y divide-purple-200/20 dark:divide-purple-700/20`}>
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-purple-500/5 dark:hover:bg-purple-800/10 transition-colors">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">{user.id}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">{user.username}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">{user.is_admin ? '是' : '否'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium space-x-2"> {/* 减小按钮间距 */}
                                        <button onClick={() => openPasswordModal(user)} className={`${highlightColor} hover:underline text-xs`}>修改密码</button>
                                        <button onClick={() => handleViewSummaryClick(user)} className={`${highlightColor} hover:underline text-xs`}>查看统计</button> {/* 新增按钮 */}
                                        <button 
                                            onClick={() => openDeleteUserModal(user)} 
                                            className={`${deleteButtonTextColor} hover:underline text-xs`}
                                        >
                                            删除用户
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showPasswordModal && selectedUserForPasswordChange && (
                <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4"> 
                    <AdminChangeUserPasswordModal
                        userId={selectedUserForPasswordChange.id}
                        username={selectedUserForPasswordChange.username}
                        onClose={closePasswordModal}
                        onPasswordChanged={fetchUsers} 
                    />
                </div>
            )}

            {showDeleteUserModal && userToDelete && (
                <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 p-4"> 
                    <AdminDeleteUserConfirmModal
                        user={userToDelete}
                        onClose={closeDeleteUserModal}
                        onConfirmDelete={confirmDeleteUser}
                    />
                </div>
            )}
        </div>
    );
}

export default AdminUserList;
