const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve React static files
app.use(express.static(path.join(__dirname, 'build')));

// For SPA fallback - check if build folder exists
const buildPath = path.join(__dirname, 'build');
const isProduction = require('fs').existsSync(buildPath);

// Hardcoded API URL
const API_BASE_URL = 'https://dq2bqs6vfe.execute-api.ap-southeast-1.amazonaws.com/logs';

// Hardcoded credentials
const API_USER = 'admin';
const API_PASS = 'password123';

// Proxy endpoint to handle API requests with pagination
app.post('/api/proxy', async (req, res) => {
  const { userId, password, action, body, page = 1, limit = 20, date_from, date_to } = req.body;

  console.log('Server received:', { date_from, date_to, page, limit });

  try {
    // Use provided credentials or fallback to hardcoded ones
    const user = userId || API_USER;
    const pass = password || API_PASS;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
    };

    // Build query URL with date filters - source is always api.openai.com
    let queryUrl = `${API_BASE_URL}/query?source=api.openai.com`;
    if (date_from) {
      queryUrl += `&date_from=${date_from}`;
    }
    if (date_to) {
      queryUrl += `&date_to=${date_to}`;
    }

    console.log('Calling API URL:', queryUrl);

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers,
    });

    console.log('External API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API error:', response.status, errorText);
      throw new Error(`External API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('API Response:', JSON.stringify(data).substring(0, 500));

    // Handle Lambda response - it returns {status, count, results}
    // Handle pagination - sort by date descending to show most recent first
    let allLogs = Array.isArray(data) ? data : (data.results || data.logs || []);
    // Transform fields to match frontend expectations
    const transformedLogs = allLogs.map(log => {
      // Extract conversation_id from requesturi (e.g., "api.openai.com/v1/chat/completions?conversation_id=93")
      let conversationId = '';
      if (log.requesturi) {
        console.log(log.requesturi)
        const match = log.requesturi.match(/conversation_id=([^&]+)/);
        conversationId = match ? match[1] : '';
      }

      // Extract SENSITIVE_INFO from sensitivedetail (e.g., "Redirect | IWS_SENSITIVE_INFO: from	IWS_RULE_NAME: Impact")
      let triggerDetails = '';
      if (log.sensitivedetail) {
        // Try to match IWS_SENSITIVE_INFO format first
        let match = log.sensitivedetail.match(/IWS_SENSITIVE_INFO: ([^\t]+)\tIWS_RULE_NAME: ([^|]+)/);
        if (match) {
          triggerDetails = `SENSITIVE_INFO: ${match[1]}\tRULE_NAME: ${match[2]}`;
        } else {
          // Try original format as fallback
          match = log.sensitivedetail.match(/SENSITIVE_INFO: ([^\t]+)\tRULE_NAME: ([^|]+)/);
          if (match) {
            triggerDetails = `SENSITIVE_INFO: ${match[1]}\tRULE_NAME: ${match[2]}`;
          } else {
            // Just use the raw sensitivedetail if no pattern matches
            triggerDetails = log.sensitivedetail;
          }
        }
      }

      return {
        'Event Name': log.event_name || '',
        'Conversation Id': conversationId,
        'Event Timestamp': log.incidenttimestamp || '',
        'Trigger Details': triggerDetails,
        'Event Triggered': log.contenttypedetected || '',
        // Keep original fields for reference
        date: log.date,
        sourceip: log.sourceip,
        destinationip: log.destinationip,
        severity: log.severity,
        requesturi: log.requesturi,
      };
    });

    // Sort by date descending (most recent first) - Lambda returns 'date' field
    transformedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalLogs = transformedLogs.length;
    const totalPages = Math.ceil(totalLogs / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = transformedLogs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalLogs,
        totalPages
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint to fetch S3 data
app.post('/api/fetch-data', async (req, res) => {
  const { url, userId, password } = req.body;

  try {
    const headers = {
      'Authorization': `Basic ${Buffer.from(`${userId}:${password}`).toString('base64')}`,
    };

    const response = await fetch(url, { headers });
    const contentType = response.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Try to parse as JSON, otherwise return as text
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Fetch data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Root route - serve React app or return status
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Log Viewer API Proxy Server',
    endpoints: {
      proxy: 'POST /api/proxy',
      fetchData: 'POST /api/fetch-data'
    }
  });
});

// Serve React app for any unmatched route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});