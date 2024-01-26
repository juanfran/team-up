import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createContext } from './auth.context.js';
import { appRouter } from './routers/index.js';
import { startWsServer } from './ws-server.js';
import { setServer } from './global.js';

export type AppRouter = typeof appRouter;

export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: true,
  }),
);

app.use(
  '/api/trpc',
  createExpressMiddleware({ router: appRouter, createContext }),
);

const port = 8000;

export function startApiServer() {
  const httpServer = app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });

  const server = startWsServer(httpServer);

  setServer(server);
}