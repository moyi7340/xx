// xx-frontend/src/components/AddIncomeForm.js
import React, { useState, useEffect, useCallback } from 'react'; 

const API_BASE_URL = 'http://localhost:8000/api'; 

function AddIncomeForm({ onIncomeAdded }) {
    const [entryDate, setEntryDate] = useState('');
    const [destination, setDestination] = useState('ONT8'); 
    const [customDestination, setCustomDestination] = useState('');
    const [amountType, setAmountType] = useState('200'); 
    const [customAmount, setCustomAmount] = useState('');
    const [isOilExpense, setIsOilExpense] = useState(false); 
    
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const updateFormBasedOnDestination = useCallback((currentDest) => {
        if (currentDest !== '其他') {
            setCustomDestination('');
        }
        const customDestGroup = document.getElementById('customDestinationFormGroup');
        if (customDestGroup) {
            customDestGroup.style.display = (currentDest === '其他') ? 'block' : 'none';
        }

        const destinationsFor200 = ["ONT8", "LBG8", "SBD1", "LAX9", "IUSP", "XLX7", "IUSJ", "POC1", "POC3"];
        let newAmountType = '其他'; 
        if (destinationsFor200.includes(currentDest)) {
            newAmountType = "200";
        } else if (currentDest === "LOCAL") {
            newAmountType = "100";
        } else if (currentDest === "油" || currentDest === "其他") {
            newAmountType = "其他";
        }
        setAmountType(newAmountType);

        const customAmountGroupEl = document.getElementById('customAmountFormGroup');
        if (customAmountGroupEl) {
            customAmountGroupEl.style.display = (newAmountType === '其他') ? 'block' : 'none';
        }
        
        const customAmountFieldEl = document.getElementById('customAmountField');
        if (newAmountType === '其他' && customAmountFieldEl) {
            customAmountFieldEl.value = ''; 
        }

        if (currentDest === '油') {
            setIsOilExpense(true);
        } else {
            setIsOilExpense(false);
        }
    }, [setAmountType, setCustomDestination, setIsOilExpense]); 

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setEntryDate(today);
        updateFormBasedOnDestination(destination); 
    }, [destination, updateFormBasedOnDestination]); 
    
    const handleDestinationChangeInternal = (e) => {
        const newDestination = e.target.value;
        setDestination(newDestination);
    };
    
    // 移除了未使用的 toggleCustomAmountInputVisibility 函数
    // const toggleCustomAmountInputVisibility = useCallback((currentAmountType) => {
    //     const customAmountGroup = document.getElementById('customAmountFormGroup'); 
    //     if (customAmountGroup) {
    //         customAmountGroup.style.display = (currentAmountType === '其他') ? 'block' : 'none';
    //         if (currentAmountType === '其他' && document.getElementById('customAmountField')) {
    //              // document.getElementById('customAmountField').focus();
    //         }
    //     }
    // }, []); 

    const handleAmountTypeChange = (e) => {
        const newAmountType = e.target.value;
        setAmountType(newAmountType);
        if (newAmountType !== '其他') {
            setCustomAmount('');
        }
        const customAmountGroupEl = document.getElementById('customAmountFormGroup');
        if (customAmountGroupEl) {
            customAmountGroupEl.style.display = (newAmountType === '其他') ? 'block' : 'none';
        }
    };
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        let finalAmount;
        if (amountType === '其他') {
            finalAmount = parseFloat(customAmount);
            if (isNaN(finalAmount) || customAmount.trim() === '' || finalAmount < 0) {
                setError('选择“其他”金额时，请输入有效的非负数字金额！');
                setLoading(false);
                return;
            }
        } else {
            finalAmount = parseFloat(amountType);
        }

        if (!entryDate || !destination) { 
            setError('请填写有效的日期和选择目的地！');
            setLoading(false);
            return;
        }
        if (isNaN(finalAmount) || finalAmount < 0 ) { 
             if ( (destination === "油" || destination === "其他") && amountType === '其他' && document.getElementById('customAmountField').value.trim() !== '' && finalAmount >= 0) {
                // Allow 0 or positive if manually entered for Oil/Other
             } else {
                setError('请输入有效的金额（非负数）！');
                setLoading(false);
                return;
             }
        }

        if (destination === '其他' && !customDestination.trim()) {
            setError('选择“其他”作为目的地时，请输入自定义目的地名称！');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('用户未认证，请先登录。');
            setLoading(false);
            return;
        }

        const payload = {
            entry_date: entryDate,
            destination: destination,
            custom_destination: destination === '其他' ? customDestination : null,
            amount: finalAmount,
            is_oil_expense: isOilExpense, 
        };

        try {
            const response = await fetch(`${API_BASE_URL}/income`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (response.ok) {
                setSuccessMessage('收入添加成功！');
                if (onIncomeAdded) {
                    onIncomeAdded(); 
                }
                setCustomDestination('');
                setCustomAmount('');
                if (destination !== '油') { 
                    setIsOilExpense(false);
                }
                // 可以在成功后重置表单到默认状态，例如：
                // setDestination('ONT8'); // 这会触发useEffect来更新其他相关字段
                // updateFormBasedOnDestination('ONT8'); // 或者直接调用
            } else {
                setError(data.message || '添加收入失败。');
            }
        } catch (err) {
            console.error('添加收入 API 请求错误:', err);
            setError('发生网络错误或服务器无响应。');
        } finally {
            setLoading(false);
            setTimeout(() => { 
                setSuccessMessage('');
                setError('');
            }, 3000);
        }
    };
    
    return (
        <div> 
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">添加新的收入记录</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="entryDate-form" className="block text-sm font-medium text-slate-700 dark:text-slate-200">日期:</label>
                    <input type="date" id="entryDate-form" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required 
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                    <label htmlFor="destination-form" className="block text-sm font-medium text-slate-700 dark:text-slate-200">目的地:</label>
                    <select id="destination-form" value={destination} onChange={handleDestinationChangeInternal} required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-700 dark:text-slate-200">
                        <option value="ONT8">ONT8</option>
                        <option value="LBG8">LBG8</option>
                        <option value="SBD1">SBD1</option>
                        <option value="LAX9">LAX9</option>
                        <option value="IUSP">IUSP</option>
                        <option value="XLX7">XLX7</option>
                        <option value="IUSJ">IUSJ</option>
                        <option value="POC1">POC1</option>
                        <option value="POC3">POC3</option>
                        <option value="LOCAL">LOCAL</option>
                        <option value="油">油</option>
                        <option value="其他">其他</option>
                    </select>
                </div>
                {/* 使用 id="customDestinationFormGroup" 以便 JS 控制显示 */}
                <div id="customDestinationFormGroup" style={{ display: destination === '其他' ? 'block' : 'none' }}>
                    <label htmlFor="customDestination-form" className="block text-sm font-medium text-slate-700 dark:text-slate-200">自定义目的地名称:</label>
                    <input type="text" id="customDestination-form" value={customDestination} onChange={(e) => setCustomDestination(e.target.value)} 
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                    <label htmlFor="amountType-form" className="block text-sm font-medium text-slate-700 dark:text-slate-200">金额:</label>
                    <select id="amountType-form" value={amountType} onChange={handleAmountTypeChange} required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-700 dark:text-slate-200">
                        <option value="100">100</option>
                        <option value="150">150</option>
                        <option value="200">200</option>
                        <option value="其他">其他</option>
                    </select>
                </div>
                <div id="customAmountFormGroup" style={{ display: amountType === '其他' ? 'block' : 'none' }}>
                    <label htmlFor="customAmountField" className="block text-sm font-medium text-slate-700 dark:text-slate-200">其他金额:</label>
                    <input type="number" id="customAmountField" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} 
                           placeholder="输入其他金额"
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
                </div>
                <div className="flex items-center">
                    <input type="checkbox" id="isOilExpense-form" checked={isOilExpense} onChange={(e) => setIsOilExpense(e.target.checked)}
                           className="h-4 w-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500" />
                    <label htmlFor="isOilExpense-form" className="ml-2 block text-sm text-slate-700 dark:text-slate-200">这是一条油费记录</label>
                </div>

                {error && <p className="text-red-500 dark:text-red-400 text-xs italic">{error}</p>}
                {successMessage && <p className="text-green-500 dark:text-green-300 text-xs italic">{successMessage}</p>}

                <button type="submit" disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50">
                    {loading ? '添加中...' : '添 加 收 入'}
                </button>
            </form>
        </div>
    );
}

export default AddIncomeForm;

