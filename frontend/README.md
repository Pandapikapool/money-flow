# Money Flow - Frontend

React + TypeScript frontend for Money Flow personal finance application.

## Quick Start

```bash
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Recharts** - Data visualization

## Project Structure

```
src/
├── pages/          # Page components (routes)
├── components/     # Reusable UI components
├── layouts/        # Layout components
└── lib/            # Utilities and API client
```

## Development

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## API Integration

The frontend communicates with the backend API via `src/lib/api.ts`. 

Default API URL: `http://localhost:3000`

## Documentation

See the main [README.md](../README.md) and [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) for more information.
