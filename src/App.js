import React, { useState } from 'react';
import Login from './components/Login';
import LogViewer from './components/LogViewer';
import DataModal from './components/DataModal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [apiUrl, setApiUrl] = useState('');
  const [selectedData, setSelectedData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogin = (userId, password, url) => {
    setCredentials({ userId, password });
    setApiUrl(url);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials(null);
    setApiUrl('');
  };

  const handleViewData = (data) => {
    setSelectedData(data);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedData(null);
  };

  return (
    <div className="container">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <header className="header">
            <h1>Log Viewer</h1>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </header>
          <LogViewer
            credentials={credentials}
            apiUrl={apiUrl}
            onViewData={handleViewData}
          />
        </>
      )}
      {isModalOpen && selectedData && (
        <DataModal data={selectedData} onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default App;
