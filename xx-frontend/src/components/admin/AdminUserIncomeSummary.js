// xx-frontend/src/components/admin/AdminUserIncomeSummary.js
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL_ADMIN = 'http://localhost:8000/api/admin';

// 从 DashboardPage 或 AdminUserList 继承颜色变量，或在这里重新定义
const cardTextColor = "text-slate-700 dark:text-slate-200";
const cardTitleColor = "text-purple-700 dark:text-purple-300";
const cardMutedTextColor = "text-slate-500 dark:text-slate-400";
const highlightColor = "text-purple-600 dark:text-purple-400";
const oilColor = "text-orange-600 dark:text-orange-400";

// 该组件接收 targetUserId 和 onBackToList (可选，用于返回用户列表)
function AdminUserIncomeSummary({ targetUserId, targetUsername, onBackToList }) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [periodType, setPeriodType] = useState('monthly');
    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonth.toString());
    const [week, setWeek] = useState(''); // 周数通常需要用户输入或从日历选择

    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFetchSummary = useCallback(async () => {
        if (!targetUserId) {
            setError('未指定用户ID。');
            return;
        }
        setLoading(true);
        setError('');
        setSummaryData(null);
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('管理员未认证。');
            setLoading(false);
            return;
        }

        let queryParams = `periodType=${periodType}&year=${year}`;
        if (periodType === 'monthly') {
            if (!month || parseInt(month, 10) < 1 || parseInt(month, 10) > 12) {
                setError('请输入有效的月份 (1-12)。'); setLoading(false); return;
            }
            queryParams += `&month=${month}`;
        } else if (periodType === 'weekly') {
            if (!week || parseInt(week, 10) < 0 || parseInt(week, 10) > 53) {
                setError('请输入有效的周数 (0-53)。'); setLoading(false); return;
            }
            queryParams += `&week=${week}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/users/${targetUserId}/income-summary?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setSummaryData(data);
            } else {
                setError(data.message || `获取用户收入统计失败。`);
            }
        } catch (err) {
            setError('网络错误，无法获取用户收入统计。');
        } finally {
            setLoading(false);
        }
    }, [targetUserId, periodType, year, month, week]);

    // 当 targetUserId 变化时，自动获取一次默认周期的统计 (可选)
    // 或者让管理员手动点击查询
    // useEffect(() => {
    //     if (targetUserId) {
    //         handleFetchSummary();
    //     }
    // }, [targetUserId, handleFetchSummary]);
    
    // 当查询参数变化时，清除旧的查询结果
    useEffect(() => {
        setSummaryData(null);
    }, [periodType, year, month, week]);


    if (!targetUserId) {
        return (
            <div className={`p-4 ${cardMutedTextColor}`}>
                请先从用户列表选择一个用户以查看其收入统计。
                {onBackToList && (
                    <button onClick={onBackToList} className={`ml-4 text-sm ${highlightColor} hover:underline`}>返回用户列表</button>
                )}
            </div>
        );
    }

    return (
        <div className="mt-0"> {/* 外层卡片样式由 DashboardPage 提供 */}
            <div className="flex justify-between items-center mb-3">
                <h4 className={`text-md font-semibold ${cardTitleColor}`}>
                    用户 "{targetUsername || targetUserId}" 的收入统计
                </h4>
                {onBackToList && (
                    <button onClick={onBackToList} className={`text-xs ${highlightColor} hover:underline`}>返回用户列表</button>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-4 items-end">
                <div>
                    <label htmlFor="admin-sum-targetUserId" className={`block text-xs font-medium ${cardMutedTextColor}`}>用户ID:</label>
                    <input type="text" id="admin-sum-targetUserId" value={targetUserId} disabled 
                           className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm sm:text-sm bg-slate-100 dark:bg-slate-700 ${cardTextColor}`} />
                </div>
                <div>
                    <label htmlFor="admin-sum-periodType" className={`block text-xs font-medium ${cardMutedTextColor}`}>统计周期:</label>
                    <select 
                        id="admin-sum-periodType" 
                        value={periodType} 
                        onChange={(e) => setPeriodType(e.target.value)}
                        className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${cardTextColor}`}
                    >
                        <option value="monthly">月度</option>
                        <option value="yearly">年度</option>
                        <option value="weekly">周度</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="admin-sum-year" className={`block text-xs font-medium ${cardMutedTextColor}`}>年份:</label>
                    <input 
                        type="number" 
                        id="admin-sum-year" 
                        value={year} 
                        onChange={(e) => setYear(e.target.value)} 
                        placeholder="YYYY"
                        className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white dark:bg-slate-700 ${cardTextColor}`}
                    />
                </div>
                {periodType === 'monthly' && (
                    <div>
                        <label htmlFor="admin-sum-month" className={`block text-xs font-medium ${cardMutedTextColor}`}>月份:</label>
                        <input 
                            type="number" 
                            id="admin-sum-month" 
                            value={month} 
                            onChange={(e) => setMonth(e.target.value)} 
                            placeholder="1-12"
                            className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white dark:bg-slate-700 ${cardTextColor}`}
                        />
                    </div>
                )}
                {periodType === 'weekly' && (
                     <div>
                        <label htmlFor="admin-sum-week" className={`block text-xs font-medium ${cardMutedTextColor}`}>周数:</label>
                        <input 
                            type="number" 
                            id="admin-sum-week" 
                            value={week} 
                            onChange={(e) => setWeek(e.target.value)} 
                            placeholder="0-53"
                            className={`mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white dark:bg-slate-700 ${cardTextColor}`}
                        />
                    </div>
                )}
                <div className={periodType === 'yearly' ? 'md:col-start-5' : ''}>
                    <button 
                        onClick={handleFetchSummary}
                        disabled={loading || !targetUserId}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                    >
                        {loading ? '查询中...' : '查 询'}
                    </button>
                </div>
            </div>

            {error && <p className={`text-red-500 dark:text-red-400 text-sm mb-4 p-2 bg-red-100/50 dark:bg-red-900/40 rounded-md`}>{error}</p>}

            {summaryData && (
                <div className={`mt-4 p-3 bg-slate-100/50 dark:bg-slate-700/40 rounded-md shadow-inner ${cardTextColor}`}>
                    <h5 className={`text-sm font-semibold ${cardTitleColor} mb-2`}>
                        查询结果: {summaryData.year}年
                        {summaryData.month ? ` ${summaryData.month}月` : ''}
                        {summaryData.week !== undefined ? ` 第${summaryData.week}周` : ''}
                    </h5>
                    <p>总收入 (含油): <span className={`font-bold ${highlightColor}`}>${(summaryData.total_income || 0).toFixed(2)}</span></p>
                    <p>总收入 (不含油): <span className={`font-bold ${highlightColor}`}>${(summaryData.total_income_excluding_oil || 0).toFixed(2)}</span></p>
                    <p>总油费: <span className={`font-bold ${oilColor}`}>${(summaryData.total_oil_expense || 0).toFixed(2)}</span></p>
                </div>
            )}
        </div>
    );
}

export default AdminUserIncomeSummary;
