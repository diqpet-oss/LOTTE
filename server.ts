import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { runMarkovEngine } from './src/services/markovEngine';
import { runMarsEngine } from './src/services/marsEngine';
import { runSandboxBacktest } from './src/services/backtestEngine';
import { getHistoricalData } from './src/services/lotteryData';
import { EngineType, PlayType } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 1: Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: '彩票量化分析与回测中台',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // API 2: Historical Data
  app.get('/api/history', (req, res) => {
    try {
      const playType = (req.query.play_type as PlayType) || 'ssq';
      const limit = parseInt(req.query.limit as string) || 50;
      const data = getHistoricalData(playType, limit);
      res.json({ play_type: playType, count: data.length, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch history' });
    }
  });

  // API 3: V2 Classic Engine (Markov + Monte Carlo)
  app.post('/api/v2/generate', (req, res) => {
    try {
      const { play_type = 'ssq', history_limit = 50, ticket_count = 10, custom_history } = req.body || {};
      const result = runMarkovEngine(
        play_type as PlayType,
        Number(history_limit),
        Number(ticket_count),
        custom_history
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'V2 generation error' });
    }
  });

  // API 4: Mars Independent Engine (Covering Design + Defense)
  app.post('/api/mars/generate', (req, res) => {
    try {
      const { play_type = 'ssq', history_limit = 50, ticket_limit = 50, custom_history } = req.body || {};
      const result = runMarsEngine(
        play_type as PlayType,
        Number(history_limit),
        Number(ticket_limit),
        custom_history
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Mars generation error' });
    }
  });

  // API 5: Sandboxed Historical Deduction Backtest
  app.post('/api/backtest', (req, res) => {
    try {
      const {
        play_type = 'ssq',
        engine_type = 'v2',
        periods = 40,
        tickets_per_period = 10
      } = req.body || {};

      const result = runSandboxBacktest(
        play_type as PlayType,
        engine_type as EngineType,
        Number(periods),
        Number(tickets_per_period)
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Backtest execution error' });
    }
  });

  // API 6: Python Source Code Inspection
  app.get('/api/python-code/:file', (req, res) => {
    const file = req.params.file;
    const allowed = ['main.py', 'mars_engine.py', 'requirements.txt'];
    if (!allowed.includes(file)) {
      return res.status(404).json({ error: 'File not allowed' });
    }
    const filePath = path.join(process.cwd(), 'python_backend', file);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(fs.readFileSync(filePath, 'utf-8'));
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Quant Engine Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
