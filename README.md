# DevSuite: Modular Developer Toolset

**DevSuite** is a professional, extensible collection of web development and data tools built with a modern full-stack architecture. Designed with a "plugin-style" registry, it allows for the rapid addition of new tools while maintaining a consistent design system and centralized backend.

## 🚀 Current Tools

### 1. Redirect Trace
A robust utility for data architects and SEOs to analyze URL resolution paths.
* **Bulk Analysis**: Process multiple URLs simultaneously (one per row).
* **Hop-by-Hop Mapping**: Visualize every status code (301, 302, etc.) in a redirect chain.
* **Header Inspection**: Expand any individual hop to view raw HTTP headers and the next location in the sequence.
* **Safety Guardrails**: Includes a 5-second timeout per request and a 10-hop limit to prevent hanging and circular loops.

---

## 🛠 Tech Stack
* **Frontend**: React (Vite), Tailwind CSS (v4), Lucide Icons.
* **Backend**: Node.js, Express, Axios.
* **Architecture**: Monorepo (Client/Server split) with a Centralized Tool Registry.

---

## 📦 Getting Started

### Prerequisites
* **Node.js**: v18 or v20+
* **nvm** (Node Version Manager): Recommended for managing environments.

### 1. Initial Setup
Clone the repository and enter the project directory:
```bash
git clone <your-repo-url>
cd dev-suite
```

### 2. Configure the Backend (Server)
The server acts as a proxy to bypass CORS restrictions and perform recursive URL lookups.
```bash
cd server
npm install
node index.js
```
*The server will start on http://localhost:3001.*

### 3. Configure the Frontend (Client)
The dashboard provides the UI and communicates with the backend API.
```bash
# Open a new terminal window/tab
cd client
npm install
npm run dev
```
*The dashboard will be available at http://localhost:5173.*

---

## 📂 Project Structure
```text
dev-suite/
├── client/                # React + Tailwind Frontend
│   ├── src/
│   │   ├── layouts/       # Dashboard shell and sidebar
│   │   ├── tools/         # Individual tool components
│   │   │   ├── registry.js # The "Source of Truth" for the suite
│   │   │   └── redirect-checker/
│   │   └── App.jsx        # Root application logic
│   └── vite.config.js
└── server/                # Node/Express Backend
    ├── index.js           # Server entry & redirect logic
    └── package.json
```

## 🏗 Adding New Tools
To add a new tool to the suite:
1. Create a new folder under `client/src/tools/[tool-name]`.
2. Build your React component.
3. Register the tool in `client/src/tools/registry.js` by adding it to the `TOOL_REGISTRY` array.
4. (Optional) Add corresponding API routes in the `server/` directory if backend logic is required.

---

## 📝 License
Internal Project - All Rights Reserved.
