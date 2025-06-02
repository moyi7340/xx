// xx-frontend/src/components/IncomeList.js
import React from 'react';

const API_BASE_URL = 'http://localhost:8000/api'; 

// 1. IncomeList 组件现在接收 totalWithOil 和 totalWithoutOil 作为 props
function IncomeList({ incomes, onIncomeDeleted, loading, totalWithOil, totalWithoutOil }) {

    const handleDelete = async (incomeId) => {
        if (!window.confirm(`确定要删除这条 ID 为 ${incomeId} 的收入记录吗？`)) {
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('用户未认证，请先登录。');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/income/${incomeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                alert('收入记录删除成功！');
                if (onIncomeDeleted) {
                    onIncomeDeleted(); 
                }
            } else {
                alert(`删除失败: ${data.message || '未知错误'}`);
            }
        } catch (err) {
            console.error('删除收入 API 请求错误:', err);
            alert('发生网络错误或服务器无响应。');
        }
    };

    // 定义与 DashboardPage 一致的文字颜色变量，以便在玻璃卡片上清晰显示
    const cardTextColor = "text-slate-700 dark:text-slate-200";
    const cardTitleColor = "text-slate-800 dark:text-slate-100";
    const cardMutedTextColor = "text-slate-500 dark:text-slate-400";
    const highlightColor = "text-sky-600 dark:text-sky-400";


    if (loading) {
        return <div className={`text-center p-4 ${cardTextColor}`}>正在加载收入列表...</div>;
    }

    return (
        <div> 
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                <h3 className={`text-lg font-semibold ${cardTitleColor} mb-2 sm:mb-0`}>未结算的收入列表</h3>
                {/* 2. 显示总额信息 - 使用 incomes.length */}
                {incomes && incomes.length > 0 && ( 
                    <div className={`text-xs sm:text-sm ${cardMutedTextColor} text-right`}>
                        <p>预计总收入 (含油): <span className={`font-bold ${highlightColor}`}>${totalWithOil}</span></p>
                        <p>预计总收入 (不含油): <span className={`font-bold ${highlightColor}`}>${totalWithoutOil}</span></p>
                    </div>
                )}
            </div>

            {!incomes || incomes.length === 0 ? (
                <p className={`${cardMutedTextColor} py-4 text-center`}>目前没有未结算的收入记录。</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-gray-200 dark:divide-slate-700 ${cardTextColor}`}>
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>日期</th>
                                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>目的地</th>
                                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>金额</th>
                                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>油费</th>
                                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>操作</th>
                            </tr>
                        </thead>
                        <tbody className={`bg-white/70 dark:bg-slate-800/70 divide-y divide-gray-200 dark:divide-slate-700`}>
                            {incomes.map((income) => (
                                <tr key={income.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{income.entry_date}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        {income.destination === '其他' && income.custom_destination 
                                            ? `${income.destination} (${income.custom_destination})` 
                                            : income.destination}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">${income.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">{income.is_oil_expense ? '是' : '否'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => handleDelete(income.id)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                                        >
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default IncomeList;
