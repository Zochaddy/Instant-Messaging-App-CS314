# Instant Messaging App – Frontend (CS314)

React + Vite frontend for the CS314 Instant Messaging application.

## Quick Start

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Run the app (development)

```bash
npm run dev
```

Then open your browser and go to the URL shown in the terminal (usually **http://localhost:5173**).

### 3. Run tests

```bash
npm test
```

This runs Jest with coverage and prints a coverage table in the terminal.

### 4. View coverage report in browser

After running `npm test`, open the HTML report:

**macOS:**
```bash
open coverage/lcov-report/index.html
```

**Windows:**
```bash
start coverage/lcov-report/index.html
```

Or open `frontend/coverage/lcov-report/index.html` in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (opens at http://localhost:5173) |
| `npm test` | Run Jest tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx       # Main app component
│   ├── App.test.jsx  # Tests
│   ├── App.css       # Styles
│   ├── main.jsx      # Entry point
│   ├── utils.js      # Helper functions
│   ├── utils.test.js # Unit tests for utils
│   └── setupTests.js # Jest setup
├── public/
├── coverage/         # Generated after npm test (gitignored)
└── package.json
```
