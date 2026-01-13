# Requirements

This document lists all the requirements needed to run Money Flow.

## System Requirements

### Required Software

1. **Node.js** (version 18 or higher)
   - Download: https://nodejs.org/
   - Check version: `node --version`
   - Minimum: v18.0.0

2. **npm** (comes with Node.js)
   - Check version: `npm --version`
   - Minimum: v9.0.0

3. **PostgreSQL** (version 12 or higher)
   - Download: https://www.postgresql.org/download/
   - Check version: `psql --version`
   - Minimum: v12.0.0

4. **Git** (for cloning the repository)
   - Download: https://git-scm.com/downloads
   - Check version: `git --version`

### Operating System

- **macOS** (10.15 or later)
- **Linux** (Ubuntu 20.04+, Debian 10+, or similar)
- **Windows** (10 or later) - WSL2 recommended

## Database Setup

### PostgreSQL Requirements

- PostgreSQL server running
- Database created: `finance_app` (or configure your own)
- User with database access
- Port: 5432 (default)

### Database Configuration

Update database connection in `backend/src/core/db.ts` if needed:
- Host: `localhost` (default)
- Port: `5432` (default)
- Database: `finance_app` (default)
- User: Your PostgreSQL username
- Password: Your PostgreSQL password

## Installation Steps

1. **Install Node.js and npm**
   ```bash
   # Check if installed
   node --version
   npm --version
   ```

2. **Install PostgreSQL**
   ```bash
   # Check if installed
   psql --version
   
   # Start PostgreSQL service
   # macOS: brew services start postgresql
   # Linux: sudo systemctl start postgresql
   # Windows: Start PostgreSQL service from Services
   ```

3. **Create Database**
   ```bash
   createdb finance_app
   # Or using psql
   psql -U your_username -c "CREATE DATABASE finance_app;"
   ```

4. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

5. **Set Up Database Schema**
   ```bash
   cd backend
   npm run setup-db
   ```

## Port Requirements

The following ports must be available:

- **3000**: Backend API server
- **5173**: Frontend development server

If these ports are in use, you can:
- Stop the applications using them
- Configure different ports in the code

## Optional Requirements

- **Code Editor**: VS Code, WebStorm, or any editor with TypeScript support
- **PostgreSQL GUI**: pgAdmin, DBeaver, or similar (for database management)
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

## Verification

Run the start script to verify all requirements:

```bash
./start.sh
```

The script will check for:
- Node.js installation
- npm installation
- PostgreSQL connection
- Required ports availability

## Troubleshooting

### Node.js not found
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### PostgreSQL not found
- Install PostgreSQL from https://www.postgresql.org/download/
- Ensure PostgreSQL service is running

### Port already in use
- Stop the application using the port
- Or change the port in the configuration

### Database connection error
- Verify PostgreSQL is running
- Check database credentials in `backend/src/core/db.ts`
- Ensure database `finance_app` exists

---

For detailed setup instructions, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
