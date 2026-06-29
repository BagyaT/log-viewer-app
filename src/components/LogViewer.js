import React, { useState, useEffect } from 'react';

// Default to last 7 days to avoid fetching ALL logs (which is slow)
const getDefaultDateFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
};

const LogViewer = ({ credentials }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date_from, setDateFrom] = useState(getDefaultDateFrom());
  const [date_to, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (userId, password, pageNum = 1, date_from, date_to) => {
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, page: pageNum, limit: 10, date_from, date_to }),
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching logs:', err);
      throw err;
    }
  };

  const loadLogs = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLogs(credentials.userId, credentials.password, pageNum, date_from, date_to);
      console.log('API response:', data);
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setPageNum(data.pagination?.page || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (credentials?.userId) {
      loadLogs();
    }
  }, [credentials?.userId, date_from, date_to]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadLogs(newPage);
    }
  };

  const getSeverityClass = (severity) => {
    if (severity >= 4) return 'severity-critical';
    if (severity >= 3) return 'severity-high';
    if (severity >= 2) return 'severity-medium';
    return 'severity-low';
  };

  const renderLogCard = (log, index) => {
    return (
      <div key={index} className={`log-card ${getSeverityClass(log.severity)}`}>
        <div className="log-card-header">
          <span className="event-name">{log['Event Name']}</span>
          <span className="conversation-id">ID: {log['Conversation Id']}</span>
        </div>
        <div className="log-card-body">
          <div className="log-field">
            <span className="field-label">Event Triggered:</span>
            <span className="field-value">{log['Event Triggered']}</span>
          </div>
          <div className="log-field">
            <span className="field-label">Event Timestamp:</span>
            <span className="field-value">{log['Event Timestamp']}</span>
          </div>
          <div className="log-field">
            <span className="field-label">Trigger Details:</span>
            <span className="field-value trigger-details">{log['Trigger Details']}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderNoLogs = () => (
    <div className="no-logs">
      No incidents found in the selected date range.
    </div>
  );

  const renderLoading = () => (
    <div className="loading">Loading...</div>
  );

  const renderError = () => (
    <div className="error-message">
      Error: {error}
    </div>
  );

  return (
    <div className="log-viewer">
      <h2>Incidents</h2>
      <div className="filters">
        <div>
          <label>From:</label>
          <input
            type="date"
            value={date_from}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label>To:</label>
          <input
            type="date"
            value={date_to}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <button className="btn-primary" onClick={() => loadLogs(1)}>Apply</button>
        </div>
      </div>

      {loading && renderLoading()}
      {error && renderError()}
      {!loading && !error && logs.length === 0 && renderNoLogs()}
      {!loading && !error && logs.length > 0 && (
        <div className="log-cards-container">
          {logs.map((log, index) => renderLogCard(log, index))}
          <div className="pagination">
            <button 
              className="btn-pagination" 
              disabled={pageNum <= 1}
              onClick={() => handlePageChange(pageNum - 1)}
            >
              Previous
            </button>
            <span>Page {pageNum} of {totalPages}</span>
            <button 
              className="btn-pagination" 
              disabled={pageNum >= totalPages}
              onClick={() => handlePageChange(pageNum + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;