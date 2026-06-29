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

function LogViewer({ credentials, apiUrl, onViewData }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalLogs: 0, totalPages: 0 });
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());

  // Fetch logs immediately when component mounts (credentials are already set from login)
  useEffect(() => {
    if (credentials?.userId && credentials?.password) {
      fetchLogs();
    }
  }, []); // Empty array - only run once on mount

  const fetchLogs = async () => {
    if (!credentials?.userId || !credentials?.password) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: credentials.userId,
          password: credentials.password,
          page: pagination.page,
          limit: pagination.limit,
          date_from: dateFrom,
          date_to: dateTo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', response.status, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      // API returns { logs: [...], pagination: {...} }
      // Map API field names to frontend field names
      console.log(data)
      const logsArray = (data.logs || []).map((log, index) => ({
        id: ((pagination.page - 1) * pagination.limit) + index + 1,
        title: log.event_name || log['Event Name'] || `Log ${index + 1}`,
        eventName: log.event_name || log['Event Name'],
        conversationId: getConversationId(log.requesturi) || '',
        eventTimestamp: log.incidenttimestamp || log['Event Timestamp'],
        triggerDetails: extractIwsInfo(log.sensitivedetail) || log['Trigger Details'],
        eventTriggered: log.contenttypedetected || log['Event Triggered'],
        date: log.incidenttimestamp || log['Event Timestamp'],
        status: log.contenttypedetected || log['Event Triggered'] || 'Available',
      }));
      setLogs(logsArray);

      // Update pagination info
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          totalLogs: data.pagination.totalLogs,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
      setError('Failed to load logs. Please try again. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleDownload = async (s3Url, logId) => {
    try {
      // Use proxy to fetch S3 data
      const response = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: s3Url,
          userId: credentials.userId,
          password: credentials.password,
        }),
      });

      const parsedData = await response.json();

      onViewData({
        logId,
        s3Url,
        content: parsedData,
      });
    } catch (err) {
      setError('Failed to download data');
    }
  };

  const parseDelimitedText = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, rows };
  };

  if (loading) {
    return <div className="loading">Loading logs...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
        <button onClick={fetchLogs} style={{ marginLeft: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Date Filter Controls */}
      <div className="date-filters" style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Filter Logs</h3>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>From Date:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>To Date:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => {
                console.log('Go clicked! Dates:', dateFrom, dateTo);
                setPagination(prev => ({ ...prev, page: 1 }));
                fetchLogs();
              }}
              style={{ padding: '8px 20px', borderRadius: '4px', border: '1px solid #007bff', background: '#007bff', color: '#fff', cursor: 'pointer' }}
            >
              Go
            </button>
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="no-logs">No logs available</div>
      ) : (
        <div className="logs-grid">
          {logs.map((log) => (
            <div key={log.id} className="log-card">
              <h3>{log.title || `Log #${log.id}`}</h3>
              <div className="log-details">
                <div className="log-detail">
                  <span>Event Name:</span>
                  <span>{log.eventName || 'N/A'}</span>
                </div>
                <div className="log-detail">
                  <span>Conversation Id:</span>
                  <span>{log.conversationId || 'N/A'}</span>
                </div>
                <div className="log-detail">
                  <span>Event Timestamp:</span>
                  <span>{log.eventTimestamp || 'N/A'}</span>
                </div>
                <div className="log-detail">
                  <span>Trigger Details:</span>
                  <span>{log.triggerDetails || 'N/A'}</span>
                </div>
                <div className="log-detail">
                  <span>Event Triggered:</span>
                  <span>{log.eventTriggered || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => goToPage(1)}
            disabled={pagination.page === 1}
            title="First page"
          >
            ««
          </button>
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            « Prev
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.totalPages}
            <br />
            <small>({pagination.totalLogs} total logs)</small>
          </span>
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next »
          </button>
          <button
            onClick={() => goToPage(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
            title="Last page"
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
function getConversationId(url) {
  const match = url.match(/conversation_id=([^&]+)/);
  return match ? match[1] : null;
}
function extractIwsInfo(log) {
  const sensitiveMatch = log.match(/IWS_SENSITIVE_INFO:\s*(.*?)\s*IWS_RULE_NAME:/);
  const ruleMatch = log.match(/IWS_RULE_NAME:\s*(.*)$/);

  const sensitiveInfo = sensitiveMatch ? sensitiveMatch[1].trim() : "";
  const ruleName = ruleMatch ? ruleMatch[1].trim() : "";

  return `SENSITIVE_INFO: ${sensitiveInfo}\nRULE_NAME: ${ruleName}`;
}
export default LogViewer;