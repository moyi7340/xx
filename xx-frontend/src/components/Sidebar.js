// xx-frontend/src/components/Sidebar.js
import React from 'react';

const IconPlaceholder = ({ className = "w-5 h-5 mr-3" }) => <span className={className}>▫️</span>;

function Sidebar({ onLogout, activeSection, setActiveSection }) {
    const navItems = [
        { name: '仪表盘', icon: <IconPlaceholder />, section: 'dashboard' }, 
        { name: '添加与查看收入', icon: <IconPlaceholder />, section: 'addAndListIncome' },
        { name: '结算记录', icon: <IconPlaceholder />, section: 'settlements' },
        { name: '收入总览', icon: <IconPlaceholder />, section: 'summary' },
    ];

    const isAdmin = JSON.parse(localStorage.getItem('userData'))?.isAdmin || false;

    // 调整导航链接样式以适应新的浅紫色背景
    // 文字颜色需要与浅紫色背景形成对比，可能需要更深一些的文字或保持白色/浅色
    const navLinkBaseClasses = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150";
    // 假设背景是 bg-indigo-500, 文字用 indigo-100 或 white
    const navLinkIdleClasses = "text-indigo-100 hover:bg-indigo-400 hover:text-white dark:text-indigo-200 dark:hover:bg-indigo-500"; 
    const activeNavLinkClasses = "bg-indigo-400 dark:bg-indigo-500 text-white shadow-md"; 

    return (
        // 背景改为更浅的靛蓝色 (例如 indigo-500)
        <div className="w-64 h-screen bg-indigo-500 dark:bg-indigo-600 text-slate-100 flex flex-col fixed top-0 left-0 z-30 shadow-2xl">
            {/* 顶部项目名称区域 */}
            <div className="h-16 flex items-center justify-center border-b border-indigo-400 dark:border-indigo-500">
                <h1 className="text-xl font-semibold text-white">收入管理</h1>
            </div>

            <nav className="flex-grow px-3 py-4 space-y-1.5">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setActiveSection ? setActiveSection(item.section) : console.log(`Navigate to ${item.name}`)}
                        className={`${navLinkBaseClasses} ${activeSection === item.section ? activeNavLinkClasses : navLinkIdleClasses}`}
                    >
                        {item.icon}
                        {item.name}
                    </button>
                ))}
                {isAdmin && (
                     <button
                        onClick={() => setActiveSection ? setActiveSection('adminDashboard') : console.log(`Navigate to Admin`)}
                        className={`${navLinkBaseClasses} ${activeSection === 'adminDashboard' ? activeNavLinkClasses : navLinkIdleClasses}`}
                    >
                        <IconPlaceholder />
                        管理员后台
                    </button>
                )}
            </nav>

            <div className="px-3 py-4 border-t border-indigo-400 dark:border-indigo-500">
                <button
                    onClick={onLogout}
                    className={`${navLinkBaseClasses} w-full bg-indigo-400 hover:bg-red-500 hover:text-white text-indigo-100 dark:bg-indigo-500 dark:hover:bg-red-600`}
                >
                    <IconPlaceholder />
                    登出
                </button>
            </div>
        </div>
    );
}

export default Sidebar;
