import type { StateActions, TuNode, UserNode } from '@team-up/board-commons';
import type { WebSocket } from 'ws';
import { Client } from './client.js';
import db from './db/index.js';

import { verifyToken } from './auth.js';
import { syncNodeBox } from '@team-up/sync-node-box';
import { Subscription, throttleTime } from 'rxjs';
import { FastifyRequest } from 'fastify';

export class Server {
  public clients: Client[] = [];
  private state: Record<string, ReturnType<typeof syncNodeBox>> = {};
  private stateSubscriptions: Record<string, Subscription> = {};

  public clientClose(client: Client) {
    this.clients = this.clients.filter((it) => it !== client);
  }

  public async connection(wss: WebSocket, req: FastifyRequest) {
    if (req.cookies['auth']) {
      const user = await verifyToken(req.cookies['auth']);
      if (user && user['name']) {
        const client = new Client(
          wss,
          this,
          user['name'] ?? 'anonymous',
          user.sub,
          user.email,
        );
        this.clients.push(client);
        return;
      }
    }

    wss.close();
  }

  public connectedBoardClients(boardId: string) {
    return this.clients.filter((it) => it.boardId === boardId);
  }

  public sendAll(boardId: string, message: unknown, exclude: Client[] = []) {
    const boardClients = this.connectedBoardClients(boardId);

    boardClients.forEach((client) => {
      if (!exclude.includes(client)) {
        client.send(message);
      }
    });
  }

  public async createBoard(boardId: string) {
    if (!this.state[boardId]) {
      if (this.stateSubscriptions[boardId]) {
        this.emptyBoard(boardId);
      }

      const board = await db.board.getBoard(boardId);

      if (!board) {
        throw new Error('board not found');
      }

      const boardNodes = board.board ?? [];

      this.state[boardId] = syncNodeBox({ history: 0 });

      this.updateBoard(
        boardId,
        boardNodes.map((it) => {
          if (it.type !== 'user') {
            return it;
          }

          return {
            ...it,
            content: {
              ...it.content,
              connected: false,
              cursor: null,
            },
          } as UserNode;
        }),
      );
      this.stateSubscriptions[boardId] = this.state[boardId]
        .sync()
        .pipe(throttleTime(2000))
        .subscribe((state) => {
          db.board.updateBoard(boardId, state);
        });
    }
  }

  public getBoard(boardId: string): TuNode[] | undefined {
    if (!this.state[boardId]) {
      return;
    }

    return this.state[boardId].get();
  }

  public setState(boardId: string, fn: (state: TuNode[]) => TuNode[]) {
    const nextState = fn(this.state[boardId].get());

    this.updateBoard(boardId, nextState);
  }

  public emptyBoard(boardId: string) {
    db.board.updateBoard(boardId, this.state[boardId].get());

    delete this.state[boardId];

    if (this.stateSubscriptions[boardId]) {
      this.stateSubscriptions[boardId].unsubscribe();
      delete this.stateSubscriptions[boardId];
    }
  }

  public getStateBoardUsers(boardId: string) {
    const state = this.getBoard(boardId);

    return state?.filter((node) => node.type === 'user') ?? [];
  }

  public isUserInBoard(boardId: string, userId: UserNode['id']) {
    const users = this.getStateBoardUsers(boardId);

    return users.some((it) => it.id === userId);
  }

  public userJoin(boardId: string, user: UserNode) {
    const isAlreadyInState = this.isUserInBoard(boardId, user.id);
    const board = this.state[boardId];

    if (isAlreadyInState) {
      board.update((state) => {
        return state.map((it) => {
          if (it.id === user.id) {
            return {
              ...it,
              content: {
                ...it.content,
                username: user.content.name,
                connected: true,
              },
            };
          }

          return it;
        });
      });
    } else {
      board.update((state) => {
        state.push(user);

        return state;
      });
    }
  }

  public getBoardUser(boardId: string, userId: UserNode['id']) {
    return db.board.getBoardUser(boardId, userId);
  }

  public getBoardUsers(boardId: string) {
    return db.board.getBoardUsers(boardId);
  }

  public applyAction(boardId: string, actions: StateActions[]) {
    return this.state[boardId].actions(actions);
  }

  public updateBoardName(boardId: string, name: string) {
    db.board.updateBoardName(boardId, name);
  }

  private updateBoard(boardId: string, state: TuNode[]) {
    this.state[boardId].update(() => state);
  }
}
