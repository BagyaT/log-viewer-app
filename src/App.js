import React, { useState } from 'react';
import Login from './components/Login';
import LogViewer from './components/LogViewer';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const handleLogin = (userId, password, url) => {
    setCredentials({ userId, password });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials(null);
  };

  return (
    <div className="container">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <header className="header">
            <div className="header-left">
              <img
                src={`${process.env.PUBLIC_URL}/Amplifi Logo_whitebg.svg`}
                alt="Amplifi Logo"
                className="header-logo"
              />
              <h1>Log Viewer</h1>
            </div>

            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </header>
          <LogViewer credentials={credentials} />
        </>
      )}
    </div>
  );
}

export default App;
