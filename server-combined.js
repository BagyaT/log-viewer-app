const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Hardcoded API URL
const API_BASE_URL = 'https://dq2bqs6vfe.execute-api.ap-southeast-1.amazonaws.com/logs';

// Hardcoded credentials
const API_USER = 'admin';
const API_PASS = 'password123';

// Proxy endpoint to handle API requests with pagination
app.post('/api/proxy', async (req, res) => {
  const { userId, password, action, body, page = 1, limit = 20, date_from, date_to } = req.body;
  
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

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    // Handle pagination - sort by date descending to show most recent first
    let allLogs = Array.isArray(data) ? data : (data.logs || []);
    // Sort by last_modified descending (most recent first)
    allLogs.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
    const totalLogs = allLogs.length;
    const totalPages = Math.ceil(totalLogs / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = allLogs.slice(startIndex, endIndex);
    
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

// Handle React Router - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});