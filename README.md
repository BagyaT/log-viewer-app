# Log Viewer Application

A web application for viewing and filtering logs from an API.

## Tech Stack

- **Frontend:** React 18 with react-scripts
- **Backend:** Express.js (Node.js)
- **API:** AWS Lambda (external)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

### Starting the Application

You need to run both frontend and backend servers.

#### Option 1: Run Both Separately (Recommended)

**Terminal 1 - Backend Server:**
```bash
node server.js
```
The backend API runs on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
npm start
```
The frontend opens at http://localhost:3000

#### Option 2: Using the Combined Server

The project includes `server-combined.js` which serves both the API and static React files:

```bash
node server-combined.js
```
Then open http://localhost:3001

## API Endpoints

- `POST /api/proxy` - Query logs with filters (userId, password, page, limit, date_from, date_to)
- `POST /api/fetch-data` - Fetch data from external S3 URLs

## Usage

1. Start both servers as shown above
2. Open http://localhost:3000 (frontend)
3. Login with credentials:
   - User ID: `admin`
   - Password: `password123`
4. View and filter logs by date range