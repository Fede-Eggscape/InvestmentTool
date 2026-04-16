require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const registerRoutes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: isProd ? true : ['http://localhost:5173', 'http://127.0.0.1:5173'],
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
registerRoutes(app);

// Serve frontend in production only when running as a single combined server
// (not needed on Vercel where frontend is served as static via CDN)
if (isProd) {
  const fs = require('fs');
  const frontendDist = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
}

// Error handler (must be last)
app.use(errorHandler);

// Escuchar solo cuando se corre directamente
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Investment App Backend running on http://localhost:${PORT}`);
    console.log(`[SERVER] Health: http://localhost:${PORT}/api/health`);
  });
}

// Exportar para Vercel (serverless)
module.exports = app;
