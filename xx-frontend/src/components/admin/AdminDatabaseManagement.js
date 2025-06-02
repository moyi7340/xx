// xx-frontend/src/components/admin/AdminDatabaseManagement.js
import React, { useState } from 'react';

const API_BASE_URL_ADMIN = 'http://localhost:8000/api/admin';

// 从 DashboardPage 继承颜色变量，或者在这里重新定义
const cardTextColor = "text-slate-700 dark:text-slate-200";
const cardTitleColor = "text-purple-700 dark:text-purple-300";
const cardMutedTextColor = "text-slate-500 dark:text-slate-400";


function AdminDatabaseManagement() {
    const [backupFilenameToRestore, setBackupFilenameToRestore] = useState('');
    const [actionStatus, setActionStatus] = useState({ message: '', type: '' }); // type: 'success' or 'error'
    const [backupList, setBackupList] = useState([]);
    const [loadingAction, setLoadingAction] = useState(''); // 'backup', 'list', 'restore'

    const handleAdminAction = async (actionType, payload = {}) => {
        setActionStatus({ message: '', type: '' });
        setLoadingAction(actionType);
        const token = localStorage.getItem('authToken');
        if (!token) {
            setActionStatus({ message: '管理员未认证，请重新登录。', type: 'error' });
            setLoadingAction('');
            return;
        }

        let url = `${API_BASE_URL_ADMIN}/`;
        let options = {
            method: 'POST', // 默认为POST，GET会覆盖
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // 恢复时需要
            },
        };

        switch (actionType) {
            case 'backup':
                url += 'backup-database';
                break;
            case 'list':
                url += 'backups';
                options.method = 'GET';
                delete options.headers['Content-Type']; // GET不需要Content-Type
                break;
            case 'restore':
                if (!backupFilenameToRestore) {
                    setActionStatus({ message: '请输入要恢复的备份文件名。', type: 'error' });
                    setLoadingAction('');
                    return;
                }
                if (!window.confirm(`确定要从备份文件 "${backupFilenameToRestore}" 恢复数据库吗？当前数据将被覆盖！恢复后强烈建议重启服务器。`)) {
                    setLoadingAction('');
                    return;
                }
                url += 'restore-database';
                options.body = JSON.stringify({ filename: backupFilenameToRestore });
                break;
            default:
                setLoadingAction('');
                return;
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (response.ok) {
                if (actionType === 'list') {
                    setBackupList(data);
                    setActionStatus({ message: '备份列表已获取。', type: 'success' });
                } else if (actionType === 'backup') {
                    setActionStatus({ message: `数据库备份成功！文件名: ${data.backupFilename}`, type: 'success' });
                    adminListBackups(); // 备份后刷新列表
                } else if (actionType === 'restore') {
                    setActionStatus({ message: data.message || '数据库恢复成功，请重启服务器！', type: 'success' });
                }
            } else {
                setActionStatus({ message: data.message || `操作失败 (${actionType})。`, type: 'error' });
                if (actionType === 'list') setBackupList([]);
            }
        } catch (err) {
            console.error(`管理员操作 (${actionType}) API 错误:`, err);
            setActionStatus({ message: `网络错误或服务器无响应 (${actionType})。`, type: 'error' });
            if (actionType === 'list') setBackupList([]);
        } finally {
            setLoadingAction('');
            setTimeout(() => setActionStatus({ message: '', type: '' }), 5000);
        }
    };
    
    const adminBackupDatabase = () => handleAdminAction('backup');
    const adminListBackups = () => handleAdminAction('list');
    const adminRestoreDatabase = () => handleAdminAction('restore', { filename: backupFilenameToRestore });


    return (
        <div className={`mt-0`}> {/* 移除外层卡片样式，由DashboardPage提供 */}
            <h4 className={`text-md font-semibold ${cardTitleColor} mb-3 border-b border-purple-300/50 dark:border-purple-600/50 pb-2`}>数据库管理</h4>
            
            {actionStatus.message && (
                <p className={`text-xs mb-3 p-2 rounded-md ${actionStatus.type === 'success' ? 'bg-green-100/50 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100/50 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                    {actionStatus.message}
                </p>
            )}

            <div className="space-y-3">
                <button 
                    onClick={adminBackupDatabase} 
                    disabled={loadingAction === 'backup'}
                    className="w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                >
                    {loadingAction === 'backup' ? '备份中...' : '创建数据库备份'}
                </button>

                <div className="mt-3">
                    <button 
                        onClick={adminListBackups} 
                        disabled={loadingAction === 'list'}
                        className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                    >
                        {loadingAction === 'list' ? '加载中...' : '列出可用备份'}
                    </button>
                    {backupList.length > 0 && (
                        <div className={`mt-3 text-xs ${cardMutedTextColor} max-h-32 overflow-y-auto p-2 border border-purple-200/50 rounded-md`}>
                            <p className={`${cardTitleColor} font-medium mb-1`}>可用备份文件:</p>
                            <ul>
                                {backupList.map(file => (
                                    <li key={file.filename} className="flex justify-between items-center py-0.5">
                                        <span>{file.filename}</span>
                                        <span className="text-xxs text-slate-400 dark:text-slate-500">
                                            ({(file.size / 1024).toFixed(1)} KB, {new Date(file.modified_time).toLocaleDateString()})
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-purple-300/50 dark:border-purple-600/50">
                    <label htmlFor="backupFilenameToRestore-admin" className={`block text-sm font-medium ${cardTextColor} mb-1`}>要恢复的备份文件名:</label>
                    <input 
                        type="text" 
                        id="backupFilenameToRestore-admin"
                        value={backupFilenameToRestore}
                        onChange={(e) => setBackupFilenameToRestore(e.target.value)}
                        placeholder="例如: backup_db_YYYYMMDD_HHMMSS.sqlite"
                        className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white dark:bg-slate-700 ${cardTextColor}`}
                    />
                    <button 
                        onClick={adminRestoreDatabase} 
                        disabled={loadingAction === 'restore' || !backupFilenameToRestore}
                        className="mt-2 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                    >
                        {loadingAction === 'restore' ? '恢复中...' : '从备份恢复数据库'}
                    </button>
                    <p className={`text-xs mt-1 ${cardMutedTextColor}`}>注意：恢复操作将覆盖当前数据，请谨慎操作！</p>
                </div>
            </div>
        </div>
    );
}

export default AdminDatabaseManagement;
