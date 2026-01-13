# Changelog

All notable changes to Money Flow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Budget year and month views with navigation
- Expense editing with tag and special tag support
- Expense date editing capability
- Expense deletion by month selection (year view)
- Activity logs for Accounts, Assets, and Life XP pages
- Editable names/titles for Life XP buckets, Assets, and Insurance plans
- SIP total units inline editing
- SIP investment type selection (SIP or Lumpsum) with invested amount
- Stocks invested value and current value fields (replaces buy price calculation)
- Stocks current price editing for Indian stocks
- Overview page USD invested amount display
- Expense distribution by category chart with month filtering
- Insurance plan total premium paid graph
- Insurance plan total premium paid display on tiles
- Insurance expired plan deletion functionality
- Clean expenses utility script for data management

### Changed
- Budget page restructured into year overview and month detail views
- Expense edit form now includes category tag and special tags selection
- Insurance graph now shows cumulative total premium paid instead of cover/premium
- Stocks form simplified to invested value, units, and current value
- SIP create form includes invested amount and investment type selection
- Currency formatting now always shows 2 decimal places
- Overview page spending trend chart replaced with expense distribution by category
- Plan history graph updated to show cumulative premium payments

### Fixed
- Mark Paid button now correctly creates plan history entries
- Date inputs allow direct typing (not just calendar picker)
- Asset page notes display now shows full text (multi-line support)
- Currency decimal display fixed (always shows 2 decimal places)

### Planned
- Multi-user authentication
- Mobile responsive design
- PDF export functionality
- Data import from CSV
- Recurring expense templates

## [1.0.0] - 2024-01-XX

### Added
- Expense tracking with date, amount, description, and tags
- Monthly budget setting and tracking
- Budget progress bar with visual indicators (green/yellow/red)
- Expense history by year and month
- Category-based expense analysis
- Accounts management (liquid money tracking)
- Assets tracking with value history
- Investments tracking (stocks, mutual funds, etc.)
- Plans management (insurance, subscriptions) with premium alerts
- Life Experiences (guilt-free spending buckets)
- Tags and special tags system
- Dark mode support
- CSV export for accounts, assets, and plans
- Balance history graphs for accounts and assets
- Premium due alerts for plans
- Plan expiry warnings
- Overview dashboard with financial snapshot

### Technical
- React 19 with TypeScript frontend
- Express.js with TypeScript backend
- PostgreSQL database
- RESTful API architecture
- Glassmorphism UI design
- CSS Variables for theming

---

## Version History

- **1.0.0**: Initial release with core features

---

## How to Read This Changelog

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security updates

---

For detailed feature descriptions, see [USER_GUIDE.md](USER_GUIDE.md).
