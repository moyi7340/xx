// xx-frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css'; 
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage'; 
import DashboardPage from './pages/DashboardPage'; // <--- 1. 确保引入 DashboardPage

// HomePagePlaceholder 的定义已移除，因为 DashboardPage 将替代它

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); 
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // 在实际应用中，这里可能还需要验证 token 的有效性
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false); 
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    navigate('/'); 
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData'); 
    setIsAuthenticated(false);
    navigate('/login'); 
  };

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/register" 
        element={!isAuthenticated ? <RegistrationPage /> : <Navigate to="/" replace />} 
      />
      
      <Route 
        path="/" 
        element={isAuthenticated ? <DashboardPage onLogout={handleLogout} /> : <Navigate to="/login" replace />} // <--- 2. 这里更新为 DashboardPage
      />
      
      <Route path="*" element={
        <div className="p-8 text-center">
          <h1 className="text-3xl font-bold text-red-500">404 - 页面未找到</h1>
        </div>
      } />
    </Routes>
  );
}

export default App;
