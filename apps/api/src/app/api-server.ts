import * as cors from 'cors';
import * as express from 'express';
import { verifyGoogle } from './auth';
import Config from './config';
import {
  createBoard,
  getBoards,
  getBoard,
  getBoardOwners,
  deleteBoard,
  deleteAccount,
  leaveBoard,
} from './db';
import * as cookieParser from 'cookie-parser';
import { body, validationResult } from 'express-validator';

export const app = express();
const port = Config.API_SERVER_PORT;

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

async function authGuard(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.cookies.auth;

  const error401 = () => {
    return res.status(401).send('Invalid token');
  };

  if (!token) {
    return error401();
  } else {
    const user = await verifyGoogle(token as string);

    if (user) {
      req.user = user;
    } else {
      return error401();
    }

    return next();
  }
}

app.post(
  '/new',
  authGuard,
  body('name').isLength({ min: 1, max: 255 }),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });

      return;
    }

    const name = req.body.name;
    const newBoardId = await createBoard(name, req.user.sub, {
      notes: [],
      groups: [],
      panels: [],
      images: [],
      texts: [],
      vectors: [],
    });

    res.json({
      id: newBoardId,
    });
  }
);

app.delete('/delete/:boardId', authGuard, async (req, res) => {
  const owners = await getBoardOwners(req.params['boardId']);

  if (owners.includes(req.user.sub)) {
    await deleteBoard(req.params['boardId']);

    res.json({
      success: true,
    });
  } else {
    res.status(400).json({
      errors: ['no permissions'],
    });
  }
});

app.delete('/leave/:boardId', authGuard, async (req, res) => {
  const owners = await getBoardOwners(req.params['boardId']);

  if (owners.includes(req.user.sub)) {
    res.status(400).json({
      errors: ['owner can not leave the board'],
    });
  } else {
    await leaveBoard(req.user.sub, req.params['boardId']);
    res.json({
      success: true,
    });
  }
});

app.delete('/remove-account', authGuard, async (req, res) => {
  await deleteAccount(req.user.sub);

  res.json({
    success: true,
  });
});

app.get('/board/:boardId', authGuard, async (req, res) => {
  const board = await getBoard(req.params['boardId']);

  if (!board) {
    res.status(404);
    res.send();
  } else {
    const owners = await getBoardOwners(req.params['boardId']);

    res.json({
      ...board,
      owners,
    });
  }
});

app.get('/boards', authGuard, async (req, res) => {
  const boards = await getBoards(req.user.sub);

  res.json(boards);
});

app.get('/user', authGuard, async (req, res) => {
  res.json({
    name: req.user.name,
    sub: req.user.sub,
  });
});

export function startApiServer() {
  app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
}
