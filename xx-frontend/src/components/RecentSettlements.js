// xx-frontend/src/components/RecentSettlements.js
import React from 'react';

// const API_BASE_URL = 'http://localhost:8000/api'; // 不再需要，操作由父组件处理

// 接收 onDelete 和 onShowDetails props
function RecentSettlements({ settlements, loading, onExportExcel, onDelete, onShowDetails }) {
    
    // 定义与 DashboardPage 一致的文字颜色变量
    const cardTextColor = "text-slate-700 dark:text-slate-200";
    const cardTitleColor = "text-purple-700 dark:text-purple-300";
    const cardMutedTextColor = "text-slate-500 dark:text-slate-400";
    // const highlightColor = "text-purple-600 dark:text-purple-400"; // <--- 移除了这个未使用的变量
    const actionButtonTextColor = "text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200";
    const deleteButtonTextColor = "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300";


    if (loading) {
        return <div className={`text-center p-4 ${cardTextColor}`}>正在加载结算记录...</div>;
    }

    // 移除组件内部的卡片样式，因为它现在由 DashboardPage 的 cardClasses 包裹
    return (
        <div> {/* 这个外层 div 不再需要卡片样式 */}
            <h3 className={`text-lg font-semibold ${cardTitleColor} mb-3`}>最近结算记录</h3>
            
            {!settlements || settlements.length === 0 ? (
                <p className={`${cardMutedTextColor} py-3 text-center`}>目前没有结算记录。</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-purple-200/30 dark:divide-purple-700/30 ${cardTextColor}`}>
                        <thead className="bg-purple-500/5 dark:bg-purple-800/10">
                            <tr>
                                <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>ID</th>
                                <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>结算时间</th>
                                <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>总金额</th>
                                <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>不含油</th>
                                <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${cardMutedTextColor} uppercase tracking-wider`}>操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-200/20 dark:divide-purple-700/20">
                            {settlements.slice(0, 10).map((settlement) => ( // 最多显示最近10条
                                <tr key={settlement.id} className="hover:bg-purple-500/5 dark:hover:bg-purple-800/10 transition-colors">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">{settlement.id}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                        {new Date(settlement.settlement_time).toLocaleDateString()} {/* 只显示日期，或用 toLocaleString() 显示完整时间 */}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">${settlement.total_amount.toFixed(2)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">${settlement.total_amount_excluding_oil.toFixed(2)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium space-x-3">
                                        <button
                                            onClick={() => onShowDetails(settlement.id)}
                                            className={`${actionButtonTextColor} hover:underline`}
                                        >
                                            详细
                                        </button>
                                        <button
                                            onClick={() => onExportExcel(settlement.id)}
                                            className={`${actionButtonTextColor} hover:underline`}
                                        >
                                            Excel
                                        </button>
                                        <button
                                            onClick={() => onDelete(settlement.id)}
                                            className={`${deleteButtonTextColor} hover:underline`}
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

export default RecentSettlements;
