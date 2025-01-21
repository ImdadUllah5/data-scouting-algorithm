import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./index.css";

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook for navigation

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('https://data-scouting-algorithm-5d5b2fde8c3c.herokuapp.com/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setError('');
                localStorage.setItem('loggedIn', 'true'); // Set login flag
                alert(data.message);
                navigate('/App'); // Redirect to main app route
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
        
        window.location.reload(); // Refresh the page to reset the app
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Login</button>
                </form>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        </div>
    );
}

export default LoginPage;
