# Money Flow

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)

A simple, manual-first personal finance application to track your expenses, budgets, and financial resources with clarity and control.

## What is Money Flow?

Money Flow helps you understand your finances by tracking:
- **Expenses**: Daily spending with tags and monthly budgets
- **Accounts**: Liquid money (savings, checking accounts)
- **Assets**: Owned items (car, jewelry, electronics)
- **Investments**: Stocks, mutual funds, fixed deposits
- **Plans**: Insurance policies, recurring commitments
- **Life Experiences**: Guilt-free spending buckets

## Key Features

- ✅ **Fast Expense Entry**: Quick capture of daily expenses
- ✅ **Monthly Budgets**: Set and track spending limits
- ✅ **Financial Overview**: See all your resources in one place
- ✅ **Tag-Based Organization**: Categorize expenses your way
- ✅ **History Tracking**: View spending patterns over time
- ✅ **Dark Mode**: Comfortable viewing in any light

## Philosophy

Money Flow follows a **manual-first** approach:
- You enter expenses yourself to feel the weight of spending
- No automatic bank syncing or AI suggestions
- The system remembers what you tell it, nothing more
- Clear, visual feedback without hidden automation

## Architecture

**Standalone Pages**: Each page in Money Flow operates independently. Pages do not communicate with each other or share state. This design ensures:
- Clear separation of concerns
- No unexpected side effects
- Predictable behavior
- Easy to understand and maintain

**Future Integration**: Accounts may be linked to expenses in future versions, but this will be an explicit, opt-in feature that maintains the manual-first philosophy.

## Quick Start

### Prerequisites

- **Node.js** (version 18 or higher)
- **PostgreSQL** (installed and running)

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:Pandapikapool/money-flow.git
   cd money-flow
   ```

2. **Set up the database**
   ```bash
   cd backend
   npm install
   # Create a database named 'finance_app' in PostgreSQL
   npm run setup-db
   ```
   
   **Note**: The database currently contains dummy/sample data for demonstration purposes. You can clear it and start fresh, or use it to explore the application.

3. **Start the application**
   ```bash
   # From the project root
   ./start.sh
   ```

   Or start manually:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm install
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm install
   npm run dev
   ```

4. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Documentation

- **[User Guide](USER_GUIDE.md)** - Learn how to use Money Flow
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Set up and contribute to the project
- **[Test Guide](TEST_GUIDE.md)** - Testing scenarios and sample data
- **[Changelog](CHANGELOG.md)** - Version history and updates
- **[Roadmap](ROADMAP.md)** - Planned features and improvements
- **[Known Bugs](KNOWN_BUGS.md)** - Current issues and limitations

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Styling**: CSS Variables with Glassmorphism design

## Project Structure

```
money_flow/
├── backend/          # Express API server
│   ├── src/         # TypeScript source
│   ├── database/    # SQL schema
│   └── dist/        # Compiled JavaScript
├── frontend/        # React application
│   ├── src/
│   │   ├── pages/   # Page components
│   │   ├── components/  # Reusable components
│   │   └── lib/     # Utilities and API client
│   └── dist/        # Built assets
└── start.sh         # Quick start script
```

## Contributing

We welcome contributions! Please see the [Developer Guide](DEVELOPER_GUIDE.md) for:
- Setting up your development environment
- Code structure and conventions
- How to submit changes

For first-time contributors, see [OPEN_SOURCE_SETUP.md](OPEN_SOURCE_SETUP.md) for repository setup.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or suggestions, please open an issue on GitHub.

---

**Note**: This is currently a single-user application. Multi-user support may be added in future versions.

**Current Data**: The application comes with dummy/sample data to help you explore features. You can clear this data and start with your own information.
