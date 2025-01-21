import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import LoginPage from './LoginPage';

function Root() {
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    console.log('isLoggedIn:', isLoggedIn);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={isLoggedIn ? <Navigate to="/App" /> : <LoginPage />} />
                <Route path="/App" element={isLoggedIn ? <App /> : <Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
