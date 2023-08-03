import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createContext } from './auth.context';

import { appRouter } from './routers';
import { startWsServer } from './ws-server';

export type AppRouter = typeof appRouter;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

const port = 8000;

export function startApiServer() {
  const httpServer = app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });

  startWsServer(httpServer);
}