// xx-frontend/src/components/IncomeSummary.js
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:8000/api'; 

function IncomeSummary() {
    const currentYear = new Date().getFullYear();
    
    const [monthlySummaries, setMonthlySummaries] = useState([]); 
    const [yearlySummary, setYearlySummary] = useState(null);   
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const cardTextColor = "text-slate-700 dark:text-slate-200";
    const cardTitleColor = "text-purple-700 dark:text-purple-300";
    const cardMutedTextColor = "text-slate-500 dark:text-slate-400";
    const highlightColor = "text-purple-600 dark:text-purple-400";
    const oilColor = "text-orange-600 dark:text-orange-400"; // 新增油费颜色


    const fetchAllSummaries = useCallback(async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('用户未认证，请重新登录。');
            setLoading(false);
            return;
        }

        try {
            const yearlyResponse = await fetch(`${API_BASE_URL}/summary/yearly?year=${currentYear}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!yearlyResponse.ok) {
                const yearlyErrorData = await yearlyResponse.json().catch(() => ({ message: `获取${currentYear}年度总览失败` }));
                throw new Error(yearlyErrorData.message);
            }
            const yearlyData = await yearlyResponse.json();
            setYearlySummary(yearlyData);

            const monthPromises = [];
            for (let month = 1; month <= 12; month++) {
                monthPromises.push(
                    fetch(`${API_BASE_URL}/summary/monthly?year=${currentYear}&month=${month}`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    }).then(res => {
                        if (!res.ok) {
                            console.warn(`获取 ${currentYear}年${month}月 总览失败，状态码: ${res.status}`);
                            return res.json().catch(() => ({ month, error: true, message: '获取数据失败' }))
                                .then(errorData => ({ month, total_amount: 0, total_amount_excluding_oil: 0, total_oil_expense: 0, error: true, errorMessage: errorData.message || '获取数据失败' }));
                        }
                        return res.json();
                    })
                    .catch(err => {
                         console.warn(`获取 ${currentYear}年${month}月 总览网络错误:`, err);
                         return { month, total_amount: 0, total_amount_excluding_oil: 0, total_oil_expense: 0, error: true, errorMessage: '网络错误' };
                    })
                );
            }
            const monthlyResults = await Promise.all(monthPromises);
            // 只显示有数据的月份（包括总收入、不含油收入或油费任一大于0）
            setMonthlySummaries(monthlyResults.filter(r => !r.error || (r.total_amount > 0 || r.total_amount_excluding_oil > 0 || r.total_oil_expense > 0) )); 

        } catch (err) {
            console.error(`获取总览数据 API 错误:`, err);
            setError(err.message || '网络错误，无法获取总览数据。');
            setMonthlySummaries([]);
            setYearlySummary(null);
        } finally {
            setLoading(false);
        }
    }, [currentYear]); 

    useEffect(() => {
        fetchAllSummaries();
    }, [fetchAllSummaries]);

    return (
        <div> 
            <h3 className={`text-lg font-semibold ${cardTitleColor} mb-4`}>收入总览 ({currentYear}年)</h3>
            
            {loading && <p className={`${cardTextColor} text-center py-4`}>正在加载总览数据...</p>}
            {error && <p className={`text-red-500 dark:text-red-400 text-sm mb-4 p-2 bg-red-100/50 dark:bg-red-900/40 rounded-md`}>{error}</p>}

            {!loading && !error && (
                <>
                    {yearlySummary && (
                        <div className="mb-6 p-3 bg-sky-100/50 dark:bg-sky-900/40 rounded-lg">
                            <h4 className={`text-md font-semibold ${cardTitleColor} mb-1`}>{currentYear}年 年度总览:</h4>
                            <p className={`${cardTextColor} text-sm`}>总收入 (含油): <span className={`font-bold text-base ${highlightColor}`}>${(yearlySummary.total_amount || 0).toFixed(2)}</span></p>
                            <p className={`${cardTextColor} text-sm`}>总收入 (不含油): <span className={`font-bold text-base ${highlightColor}`}>${(yearlySummary.total_amount_excluding_oil || 0).toFixed(2)}</span></p>
                            <p className={`${cardTextColor} text-sm`}>年度总油费: <span className={`font-bold text-base ${oilColor}`}>${(yearlySummary.total_oil_expense || 0).toFixed(2)}</span></p> {/* <--- 新增年度总油费 */}
                        </div>
                    )}

                    <h4 className={`text-md font-semibold ${cardTitleColor} mt-4 mb-2`}>{currentYear}年 月度总览:</h4>
                    {monthlySummaries.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {monthlySummaries.map((summary) => (
                                (summary.total_amount > 0 || summary.total_amount_excluding_oil > 0 || summary.total_oil_expense > 0) && 
                                <div key={summary.month} className="p-3 bg-slate-100/50 dark:bg-slate-700/40 rounded-md shadow">
                                    <p className={`font-semibold ${cardTitleColor}`}>{summary.year}年 {summary.month}月</p>
                                    <p className={`${cardMutedTextColor} text-xs`}>含油: <span className={`font-medium ${highlightColor}`}>${(summary.total_amount || 0).toFixed(2)}</span></p>
                                    <p className={`${cardMutedTextColor} text-xs`}>不含油: <span className={`font-medium ${highlightColor}`}>${(summary.total_amount_excluding_oil || 0).toFixed(2)}</span></p>
                                    <p className={`${cardMutedTextColor} text-xs`}>总油费: <span className={`font-medium ${oilColor}`}>${(summary.total_oil_expense || 0).toFixed(2)}</span></p> {/* <--- 新增月度总油费 */}
                                    {summary.errorMessage && <p className="text-red-500 text-xs mt-1">({summary.errorMessage})</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={`${cardMutedTextColor} text-sm`}>当年没有月度结算数据。</p>
                    )}
                </>
            )}
        </div>
    );
}

export default IncomeSummary;
