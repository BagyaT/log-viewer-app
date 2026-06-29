import React from 'react';

function DataModal({ data, onClose }) {
  const { content, rawText, s3Url, logId } = data;

  const renderContent = () => {
    if (!content) {
      return <div className="no-logs">No data available</div>;
    }

    // If it's an array of objects (parsed JSON array)
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return <div className="no-logs">No data records found</div>;
      }
      return renderTable(content);
    }

    // If it's a parsed delimited text object
    if (content.headers && content.rows) {
      return renderTable(content.rows, content.headers);
    }

    // If it's a single object
    if (typeof content === 'object') {
      return renderObject(content);
    }

    // Fallback to raw text
    return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{rawText}</pre>;
  };

  const renderTable = (data, customHeaders) => {
    const headers = customHeaders || (data.length > 0 ? Object.keys(data[0]) : []);
    
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, colIndex) => (
                  <td key={colIndex}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderObject = (obj) => {
    const entries = Object.entries(obj);
    
    return (
      <table className="data-table">
        <tbody>
          {entries.map(([key, value], index) => (
            <tr key={index}>
              <th>{key}</th>
              <td>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Log Details - #{logId}</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          <strong>Source:</strong> {s3Url}
        </p>
        <div>{renderContent()}</div>
        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default DataModal;
