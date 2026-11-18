# Technical Stack

- Frontend: React 19, TypeScript, Vite 8, Tailwind, React Router 7, TanStack Query, wagmi 3, viem, Leaflet, Recharts, Axios.
- Backend: Node.js, Express 5, TypeScript executed with tsx, SQLite (`sqlite` + `sqlite3`), Zod, JWT, bcrypt, multer, ethers 6.
- Chain workspace: Hardhat 2.29.x, Solidity 0.8.24, ethers 6, Mocha/Chai dependencies; current TypeScript test discovery is broken/unverified.
- Tests: backend `node:test`; frontend build/lint scripts but no discovered frontend test suite; blockchain Hardhat script exists but reports zero tests.
- Config examples: backend `.env.example`; blockchain `.env.example`. Actual env files were not inspected.
