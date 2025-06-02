// xx-frontend/src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar'; 
import AddIncomeForm from '../components/AddIncomeForm'; 
import IncomeList from '../components/IncomeList';     
import RecentSettlements from '../components/RecentSettlements'; 
import IncomeSummary from '../components/IncomeSummary'; 
import ChangePasswordForm from '../components/ChangePasswordForm'; 
import AdminDatabaseManagement from '../components/admin/AdminDatabaseManagement';
import AdminUserList from '../components/admin/AdminUserList'; 
import AdminUserIncomeSummary from '../components/admin/AdminUserIncomeSummary'; // <--- 引入 AdminUserIncomeSummary

const API_BASE_URL = 'http://localhost:8000/api'; 

function DashboardPage({ onLogout }) {
    const [username, setUsername] = useState('James');
    const [unsettledIncomes, setUnsettledIncomes] = useState([]);
    const [settlements, setSettlements] = useState([]); 
    const [isLoadingIncomes, setIsLoadingIncomes] = useState(false);
    const [isLoadingSettlements, setIsLoadingSettlements] = useState(false); 
    const [fetchError, setFetchError] = useState('');
    const [settlementActionError, setSettlementActionError] = useState(''); 
    const [settlementActionSuccess, setSettlementActionSuccess] = useState(''); 
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [activeSection, setActiveSection] = useState('dashboard'); 

    const [showSettlementDetailsModal, setShowSettlementDetailsModal] = useState(false);
    const [currentSettlementDetails, setCurrentSettlementDetails] = useState(null);
    const [isLoadingSettlementDetails, setIsLoadingSettlementDetails] = useState(false);
    const [settlementDetailsError, setSettlementDetailsError] = useState('');

    // 新增 State 用于管理员查看特定用户收入统计
    const [targetUserIdForSummary, setTargetUserIdForSummary] = useState(null);
    const [targetUsernameForSummary, setTargetUsernameForSummary] = useState('');


    const glassCardClasses = "bg-purple-500/5 dark:bg-purple-800/10 shadow-xl rounded-xl p-4 border border-purple-400/20 dark:border-purple-600/30";
    const modalCardClasses = "bg-white dark:bg-slate-800 shadow-xl rounded-xl p-4 border border-gray-300 dark:border-slate-700";
    const pageBgClasses = "bg-slate-200 dark:bg-slate-900"; 
    const cardTextColor = "text-slate-700 dark:text-slate-200"; 
    const cardTitleColor = "text-purple-700 dark:text-purple-300"; 
    const cardMutedTextColor = "text-slate-500 dark:text-slate-400";
    const highlightColor = "text-purple-600 dark:text-purple-400";
    const modalStrongText = "text-gray-900 dark:text-gray-100";
    const modalMutedText = "text-gray-600 dark:text-gray-300";
    const modalHighlightText = "text-purple-600 dark:text-purple-400";
    const modalTableHeadColor = "text-purple-700 dark:text-purple-300"; 


    const fetchUnsettledIncomes = useCallback(async () => {
        setIsLoadingIncomes(true); setFetchError('');
        const token = localStorage.getItem('authToken');
        if (!token) { setFetchError('用户未认证'); setIsLoadingIncomes(false); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/income`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (response.ok) setUnsettledIncomes(await response.json());
            else { setFetchError((await response.json().catch(()=>({message:'获取列表失败'}))).message); setUnsettledIncomes([]); }
        } catch (err) { setFetchError('网络错误'); setUnsettledIncomes([]); } 
        finally { setIsLoadingIncomes(false); }
    }, []); 

    const fetchSettlements = useCallback(async () => {
        setIsLoadingSettlements(true);
        const token = localStorage.getItem('authToken');
        if (!token) { setIsLoadingSettlements(false); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/settlements`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (response.ok) setSettlements(await response.json());
            else console.error("获取结算列表失败:", (await response.json().catch(()=>({message:''}))).message);
        } catch (err) { console.error('获取结算列表 API 请求错误:', err); } 
        finally { setIsLoadingSettlements(false); }
    }, []);

    useEffect(() => {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            try { setUsername(JSON.parse(storedUserData).username || 'James'); } 
            catch (error) { setUsername('James'); }
        } else { setUsername('James'); }
        fetchUnsettledIncomes(); fetchSettlements(); 
    }, [fetchUnsettledIncomes, fetchSettlements]);

    const unsettledTotals = useMemo(() => {
        let tWO = 0, tWoO = 0;
        unsettledIncomes.forEach(inc => { tWO += inc.amount; if (!inc.is_oil_expense) tWoO += inc.amount; });
        return { totalWithOil: tWO.toFixed(2), totalWithoutOil: tWoO.toFixed(2) };
    }, [unsettledIncomes]);

    const handleExecuteSettlement = async () => {
        setSettlementActionError(''); setSettlementActionSuccess('');
        const token = localStorage.getItem('authToken');
        if (!token) { setSettlementActionError('用户未认证'); return; }
        if (!window.confirm('确定执行结算?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/settlements`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
            const data = await response.json();
            if (response.ok) { setSettlementActionSuccess(`结算成功！ID: ${data.settlementId}`); fetchUnsettledIncomes(); fetchSettlements(); }
            else setSettlementActionError(data.message || '结算失败');
        } catch (err) { setSettlementActionError('网络错误，结算失败'); } 
        finally { setTimeout(() => { setSettlementActionError(''); setSettlementActionSuccess(''); }, 3000); }
    };

    const handleExportExcel = async (settlementId) => {
        const token = localStorage.getItem('authToken');
        if (!token) { alert('用户未认证'); return; }
        setSettlementActionError(''); setSettlementActionSuccess('');
        try {
            const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}/export`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` }});
            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                const disposition = response.headers.get('content-disposition');
                let filename = `settlement_${settlementId}_details.xlsx`;
                if (disposition && disposition.includes('attachment')) {
                    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (match && match[1]) filename = match[1].replace(/['"]/g, '');
                }
                a.download = filename; document.body.appendChild(a); a.click(); a.remove();
                window.URL.revokeObjectURL(downloadUrl);
                setSettlementActionSuccess(`结算ID ${settlementId} Excel已下载`);
            } else { setSettlementActionError(`导出失败: ${(await response.json().catch(()=>({message: '未知错误'}))).message}`); }
        } catch (error) { setSettlementActionError('导出Excel网络错误'); }
        finally { setTimeout(() => { setSettlementActionError(''); setSettlementActionSuccess(''); }, 3000); }
    };

    const toggleChangePasswordModal = () => { 
        setShowChangePasswordModal(!showChangePasswordModal);
    };
    
    const handleIncomeAdded = () => {
        fetchUnsettledIncomes();
    };

    const handleDeleteSettlement = async (settlementId) => {
        if (!window.confirm(`确定要删除结算记录 ID: ${settlementId} 吗？相关的收入条目将恢复为未结算状态。`)) {
            return;
        }
        setSettlementActionError(''); setSettlementActionSuccess('');
        const token = localStorage.getItem('authToken');
        if (!token) { setSettlementActionError('用户未认证'); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setSettlementActionSuccess(data.message || `结算记录 ID: ${settlementId} 已删除。`);
                fetchSettlements(); 
                fetchUnsettledIncomes(); 
            } else {
                setSettlementActionError(data.message || '删除结算记录失败。');
            }
        } catch (err) {
            setSettlementActionError('网络错误，删除结算记录失败。');
        } finally {
            setTimeout(() => { setSettlementActionError(''); setSettlementActionSuccess(''); }, 3000);
        }
    };

    const handleShowSettlementDetails = async (settlementId) => {
        setIsLoadingSettlementDetails(true);
        setSettlementDetailsError('');
        setCurrentSettlementDetails(null);
        const token = localStorage.getItem('authToken');
        if (!token) { 
            setSettlementDetailsError('用户未认证'); 
            setIsLoadingSettlementDetails(false); 
            return; 
        }
        try {
            const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setCurrentSettlementDetails(data);
                setShowSettlementDetailsModal(true);
            } else {
                setSettlementDetailsError(data.message || '获取结算详情失败。');
            }
        } catch (err) {
            setSettlementDetailsError('网络错误，获取结算详情失败。');
        } finally {
            setIsLoadingSettlementDetails(false);
        }
    };

    const toggleSettlementDetailsModal = () => {
        setShowSettlementDetailsModal(!showSettlementDetailsModal);
        if (showSettlementDetailsModal) { 
            setCurrentSettlementDetails(null); 
            setSettlementDetailsError('');
        }
    };

    // 新增：处理从用户列表跳转到用户收入统计
    const handleShowAdminUserSummary = (userId, uName) => {
        setTargetUserIdForSummary(userId);
        setTargetUsernameForSummary(uName);
        setActiveSection('adminUserIncomeDetail'); // 切换到显示用户统计的 section
    };


    const renderMainContent = () => {
        switch (activeSection) {
            case 'dashboard': 
            case 'addAndListIncome': 
                return ( /* ... (代码保持不变) ... */ <>
                        {activeSection === 'dashboard' && ( 
                            <div className={`${glassCardClasses} mb-6`}> 
                                <div className="p-2 sm:p-3 flex justify-between items-center">
                                    <h2 className={`text-lg sm:text-xl font-semibold ${cardTitleColor}`}> 
                                        欢迎回来, <span className={`font-bold ${highlightColor}`}>{username}</span>!
                                    </h2>
                                    <button
                                        onClick={toggleChangePasswordModal}
                                        className={`ml-3 ${highlightColor} hover:text-purple-700 dark:hover:text-purple-200 text-xs sm:text-sm font-medium transition-colors`}
                                    >
                                        修改密码
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className={`${glassCardClasses} mb-6`}>
                             <AddIncomeForm onIncomeAdded={handleIncomeAdded} />
                        </div>
                        {fetchError && (
                            <div className={`my-4 p-3 bg-red-100/80 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded-lg ${glassCardClasses}`}>
                                获取数据时出错: {fetchError}
                            </div>
                        )}
                        <div className={`${glassCardClasses} mb-6`}>
                            <IncomeList incomes={unsettledIncomes} onIncomeDeleted={fetchUnsettledIncomes} loading={isLoadingIncomes} totalWithOil={unsettledTotals.totalWithOil} totalWithoutOil={unsettledTotals.totalWithoutOil} />
                            <div className={`mt-4 pt-4 border-t border-purple-300/50 dark:border-purple-600/50`}>
                                {settlementActionError && <p className="text-red-600 dark:text-red-400 text-xs mb-2 p-1.5 bg-red-100/50 dark:bg-red-900/40 rounded-md">{settlementActionError}</p>}
                                {settlementActionSuccess && <p className="text-green-600 dark:text-green-300 text-xs mb-2 p-1.5 bg-green-100/50 dark:bg-green-900/40 rounded-md">{settlementActionSuccess}</p>}
                                <button onClick={handleExecuteSettlement} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg shadow-md text-sm" disabled={unsettledIncomes.length === 0 && !isLoadingIncomes} >
                                    结 算 
                                </button>
                                {unsettledIncomes.length === 0 && !isLoadingIncomes && <p className={`text-xs ${cardMutedTextColor} mt-1.5 inline-block ml-3`}>当前没有可结算的收入。</p>}
                            </div>
                        </div>
                    </>
                );
            case 'settlements':
                return ( /* ... (代码保持不变) ... */ <div className={`${glassCardClasses}`}><RecentSettlements settlements={settlements} loading={isLoadingSettlements} onExportExcel={handleExportExcel} onDelete={handleDeleteSettlement} onShowDetails={handleShowSettlementDetails} /></div>);
            case 'summary':
                return ( /* ... (代码保持不变) ... */ <div className={`${glassCardClasses}`}><IncomeSummary /> </div>);
            case 'adminDashboard': 
                 return (
                    <div className="space-y-6"> 
                        <div className={`${glassCardClasses}`}>
                            <h2 className={`text-xl font-semibold ${cardTitleColor} mb-4`}>管理员控制台</h2>
                            {/* 传递 onShowUserSummary 给 AdminUserList */}
                            <AdminUserList onShowUserSummary={handleShowAdminUserSummary} /> 
                        </div>
                        <div className={`${glassCardClasses}`}>
                            <AdminDatabaseManagement /> 
                        </div>
                    </div>
                );
            case 'adminUserIncomeDetail': // 新增 case 用于显示特定用户的收入统计
                return (
                    <div className={`${glassCardClasses}`}>
                        <AdminUserIncomeSummary 
                            targetUserId={targetUserIdForSummary} 
                            targetUsername={targetUsernameForSummary}
                            onBackToList={() => setActiveSection('adminDashboard')} // 提供返回用户列表的功能
                        />
                    </div>
                );
            default:
                return <div className={`${glassCardClasses} ${cardTextColor}`}>请从左侧选择一个功能。</div>;
        }
    };

    return (
        <div className={`flex h-screen ${pageBgClasses}`}> 
            <Sidebar onLogout={onLogout} activeSection={activeSection} setActiveSection={setActiveSection} />
            
            <div className={`flex-1 p-4 sm:p-6 overflow-y-auto ml-64 ${cardTextColor}`}> 
                {renderMainContent()}
            </div>

            {showChangePasswordModal && ( /* ... (修改密码弹窗代码保持不变) ... */ <div className="fixed inset-0 bg-black/75 overflow-y-auto h-full w-full flex justify-center items-center z-50 px-4 transition-opacity duration-300 ease-in-out"> <div className={`relative w-full max-w-md ${modalCardClasses}`}> <button onClick={toggleChangePasswordModal} className={`absolute top-0 right-0 mt-3 mr-3 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors z-10`} aria-label="关闭弹窗" > <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> </svg> </button> <ChangePasswordForm onCloseModal={toggleChangePasswordModal} /> </div> </div>)}
            {showSettlementDetailsModal && currentSettlementDetails && ( /* ... (结算详情弹窗代码保持不变) ... */ <div className="fixed inset-0 bg-black/75 overflow-y-auto h-full w-full flex justify-center items-center z-50 px-4"> <div className={`relative w-full max-w-2xl ${modalCardClasses} max-h-[90vh] flex flex-col ${modalStrongText}`}> <div className={`flex justify-between items-center border-b border-gray-300 dark:border-slate-700 pb-2 mb-3`}> <h3 className={`text-lg font-semibold ${modalStrongText}`}> 结算详情 (ID: {currentSettlementDetails.settlementDetails.id}) </h3> <button onClick={toggleSettlementDetailsModal} className={`p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors`} aria-label="关闭弹窗" > <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> </svg> </button> </div> {isLoadingSettlementDetails && <p className={modalStrongText}>正在加载详情...</p>} {settlementDetailsError && <p className="text-red-600 dark:text-red-400">{settlementDetailsError}</p>} {currentSettlementDetails && !isLoadingSettlementDetails && !settlementDetailsError && (<div className={`overflow-y-auto flex-grow ${modalStrongText}`}> <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-3 text-sm ${modalStrongText}`}> <p><strong className={modalStrongText}>结算时间:</strong> {new Date(currentSettlementDetails.settlementDetails.settlement_time).toLocaleString()}</p> <p><strong className={modalStrongText}>总金额 (含油):</strong> <span className={modalHighlightText}>${currentSettlementDetails.settlementDetails.total_amount.toFixed(2)}</span></p> <p><strong className={modalStrongText}>用户ID:</strong> {currentSettlementDetails.settlementDetails.user_id}</p> <p><strong className={modalStrongText}>总金额 (不含油):</strong> <span className={modalHighlightText}>${currentSettlementDetails.settlementDetails.total_amount_excluding_oil.toFixed(2)}</span></p> </div> <h4 className={`text-md font-semibold ${modalStrongText} mt-3 mb-1 border-t border-gray-300 dark:border-slate-700 pt-2`}>包含的收入记录:</h4> {currentSettlementDetails.incomeEntries && currentSettlementDetails.incomeEntries.length > 0 ? (<div className="overflow-x-auto text-xs"> <table className={`min-w-full divide-y divide-gray-200 dark:divide-slate-700`}> <thead className="bg-gray-100 dark:bg-slate-700"> <tr> <th className={`px-3 py-2 text-left font-medium ${modalTableHeadColor}`}>ID</th> <th className={`px-3 py-2 text-left font-medium ${modalTableHeadColor}`}>日期</th> <th className={`px-3 py-2 text-left font-medium ${modalTableHeadColor}`}>目的地</th> <th className={`px-3 py-2 text-left font-medium ${modalTableHeadColor}`}>金额</th> <th className={`px-3 py-2 text-left font-medium ${modalTableHeadColor}`}>油费</th> </tr> </thead> <tbody className={`divide-y divide-gray-200 dark:divide-slate-700 ${modalStrongText}`}> {currentSettlementDetails.incomeEntries.map(entry => (<tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50"> <td className="px-3 py-1.5 whitespace-nowrap">{entry.id}</td> <td className="px-3 py-1.5 whitespace-nowrap">{entry.entry_date}</td> <td className="px-3 py-1.5 whitespace-nowrap"> {entry.destination === '其他' && entry.custom_destination ? `${entry.destination} (${entry.custom_destination})` : entry.destination} </td> <td className="px-3 py-1.5 whitespace-nowrap">${entry.amount.toFixed(2)}</td> <td className="px-3 py-1.5 whitespace-nowrap">{entry.is_oil_expense ? '是' : '否'}</td> </tr>))} </tbody> </table> </div>) : (<p className={modalMutedText}>没有找到相关的收入记录。</p>)} </div>)} <div className="mt-4 pt-3 border-t border-gray-300 dark:border-slate-700 text-right"> <button onClick={toggleSettlementDetailsModal} className={`bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium py-1.5 px-4 rounded-md`} > 关闭 </button> </div> </div> </div>
            )}
        </div>
    );
}

export default DashboardPage;