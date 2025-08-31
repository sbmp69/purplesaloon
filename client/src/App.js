import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TokenProvider } from './context/TokenContext';
import Home from './pages/Home';
import Services from './pages/Services';
import TokenForm from './pages/TokenForm';
import TokenSuccess from './pages/TokenSuccess';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';

const App = () => (
  <TokenProvider>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/form" element={<TokenForm />} />
      <Route path="/success" element={<TokenSuccess />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/panel" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </TokenProvider>
);

export default App;
