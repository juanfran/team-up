import {
  applyDiff,
  Board,
  BoardCommonActions,
  Diff,
  getDiff,
} from '@team-up/board-commons';
import * as WebSocket from 'ws';
import { Server } from './server';
import { joinBoard, getBoardOwners } from './db';
import { checkPermissionsAction } from './permissions';

export class Client {
  public boardId!: string;
  public isOwner!: boolean;
  public sendTimeout?: ReturnType<typeof setTimeout>;
  public pendingMsgs: unknown[] = [];

  constructor(
    public ws: WebSocket,
    private server: Server,
    public username: string,
    public id: string
  ) {
    this.ws.on('message', this.incomingMessage.bind(this));
  }

  public isSessionEvent(diff: Diff) {
    const isUserEvent = !!(
      diff.edit?.user ||
      diff.add?.user ||
      diff.remove?.user
    );
    return isUserEvent;
  }

  public incomingMessage(messageString: string) {
    const message = this.parseMessage(messageString);

    if ('action' in message) {
      if (message.action === 'join') {
        this.join(message);
      }
    } else {
      const state = this.server.getBoard(this.boardId);

      if (!checkPermissionsAction(state, message, this.id)) {
        return;
      }

      const diffResult = getDiff(message, this.id);

      if (diffResult) {
        this.server.checkConnections(this.boardId);

        this.updateStateWithDiff(diffResult);
        this.server.sendAll(
          this.boardId,
          {
            type: BoardCommonActions.wsSetState,
            data: diffResult,
          },
          [this]
        );

        const persist = !this.isSessionEvent(diffResult);

        if (persist) {
          this.server.persistBoard(this.boardId);
        }

        if (BoardCommonActions.setVisible === message.type) {
          this.server.setUserVisibility(this.boardId, this.id, message.visible);
        }
      } else if (
        BoardCommonActions.setBoardName === message.type &&
        this.isOwner
      ) {
        this.server.updateBoardName(this.boardId, message.name);

        this.server.checkConnections(this.boardId);
        this.server.sendAll(this.boardId, message, [this]);
      }
    }
  }

  private async join(message: { boardId: string }) {
    this.boardId = message.boardId;

    joinBoard(this.id, this.boardId);

    await this.server.createBoard(this.boardId);
    const boardUser = await this.server.getBoardUser(this.boardId, this.id);

    const user = {
      name: this.username,
      id: this.id,
      visible: boardUser?.visible ?? false,
      connected: true,
      cursor: null,
    };

    this.server.userJoin(this.boardId, user);

    const board = this.server.getBoard(this.boardId);

    const users = board.users.map((it) => {
      if (it.id === user.id) {
        return user;
      }

      return it;
    });

    const owners = await getBoardOwners(this.boardId);

    this.isOwner = owners.includes(this.id);

    const diff: Diff = {
      set: {
        note: board.notes,
        user: users,
        group: board.groups,
        panel: board.panels,
        image: board.images,
        text: board.texts,
      },
    };

    this.server.sendAll(
      this.boardId,
      {
        type: BoardCommonActions.wsSetState,
        data: {
          edit: {
            users: [user],
          },
        },
      },
      [this]
    );

    this.send({
      type: BoardCommonActions.wsSetState,
      data: diff,
    });
  }

  public send(msg: unknown) {
    this.pendingMsgs.push(msg);

    if (this.sendTimeout) {
      return;
    }

    this.sendTimeout = setTimeout(() => {
      this.ws.send(JSON.stringify(this.pendingMsgs));
      this.pendingMsgs = [];
      this.sendTimeout = undefined;
    }, 50);
  }

  private parseMessage(messageString: string) {
    return JSON.parse(messageString);
  }

  private updateStateWithDiff(diff: Diff) {
    this.server.setState(this.boardId, (state) => {
      return applyDiff(diff, state);
    });
  }
}
