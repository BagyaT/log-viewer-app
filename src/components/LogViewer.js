import React, { useState, useEffect } from 'react';

// Default to last 7 days to avoid fetching ALL logs (which is slow)
const getDefaultDateFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
};

const getDefaultDateTo = () => {
  return new Date().toISOString().split('T')[0];
};

const fetchLogs = async (userId, password, page = 1, date_from, date_to) => {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        password,
        page,
        limit: 20,
        date_from,
        date_to
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
};

const LogViewer = ({ credentials }) => {
  const { userId, password } = credentials || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [date_from, setDateFrom] = useState(getDefaultDateFrom());
  const [date_to, setDateTo] = useState(getDefaultDateTo());
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (userId && password) {
      loadLogs(1);
    }
  }, [userId, password]);

  const loadLogs = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLogs(userId, password, pageNum, date_from, date_to);
      console.log('API response:', data);
      setLogs(data.logs || []);
      const total = data.pagination?.total || data.logs?.length || 0;
      setTotalPages(Math.ceil(total / 20) || 1);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setError('Failed to load logs. Please try again.');
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadLogs(newPage);
    }
  };

  const handleDateFilter = () => {
    setCurrentPage(1);
    loadLogs(1);
  };

  if (loading) {
    return (
      <div className="log-viewer loading">
        <div className="spinner"></div>
        <p>Loading logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="log-viewer error">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => loadLogs(currentPage)} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="log-viewer">
      <div className="filters">
        <div className="filter-group">
          <label>
            From:
            <input
              type="date"
              value={date_from}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={date_to}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <button onClick={handleDateFilter} className="filter-btn">
            Apply
          </button>
        </div>
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Conversation ID</th>
              <th>Timestamp</th>
              <th>Triggered</th>
              <th>Severity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">No logs found</td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr key={index} onClick={() => setSelectedLog(log)}>
                  <td>{log['Event Name'] || '-'}</td>
                  <td>{log['Conversation Id'] || '-'}</td>
                  <td>{log['Event Timestamp'] || '-'}</td>
                  <td>{log['Event Triggered'] || '-'}</td>
                  <td>
                    <span className={`severity severity-${log.severity || 1}`}>
                      {log.severity || '-'}
                    </span>
                  </td>
                  <td>
                    <button className="view-btn">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Log Details</h2>
            <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
            <button onClick={() => setSelectedLog(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;