import { TRPCError, initTRPC } from '@trpc/server';
import { AuthContext } from './auth.context';
import db from './db';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const tAuth = initTRPC.context<AuthContext>().create();

const isAuthed = tAuth.middleware((opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});

const teamCheck = isAuthed.unstable_pipe(async (opts) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = opts.rawInput as any;

  if (!inputs.teamId) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }

  const team = await db.team.getTeam(inputs.teamId);

  if (!team) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      team,
    },
  });
});

const teamAdminCheck = teamCheck.unstable_pipe(async (opts) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = opts.rawInput as any;

  const userTeam = await db.team.getUserTeam(inputs.teamId, opts.ctx.user.sub);

  if (userTeam?.role !== 'admin') {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      userTeam,
    },
  });
});

const teamMemberCheck = teamCheck.unstable_pipe(async (opts) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = opts.rawInput as any;

  const userTeam = await db.team.getUserTeam(inputs.teamId, opts.ctx.user.sub);

  if (!userTeam) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      userTeam,
    },
  });
});

const boardCheck = isAuthed.unstable_pipe(async (opts) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = opts.rawInput as any;

  const board = await db.board.getBoard(inputs.boardId);

  if (!board) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      board,
    },
  });
});

const boardAdminCheck = boardCheck.unstable_pipe(async (opts) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = opts.rawInput as any;

  const admins = await db.board.getAllBoardAdmins(inputs.boardId);

  if (!admins.includes(opts.ctx.user.sub)) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    ctx: opts.ctx,
  });
});

const boardMemberCheck = boardCheck.unstable_pipe(async (opts) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = opts.rawInput as any;

  const haveAccess = await db.board.haveAccess(
    inputs.boardId,
    opts.ctx.user.sub
  );

  if (!haveAccess) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const userBoard = await db.board.getBoardUser(
    inputs.boardId,
    opts.ctx.user.sub
  );

  return opts.next({
    ctx: {
      ...opts.ctx,
      userBoard,
    },
  });
});

export const protectedProcedure = tAuth.procedure.use(isAuthed);

export const teamProcedure = protectedProcedure.use(teamCheck);
export const teamAdminProcedure = teamProcedure.use(teamAdminCheck);
export const teamMemberProcedure = teamProcedure.use(teamMemberCheck);

export const boardProcedure = protectedProcedure.use(boardCheck);
export const boardAdminProcedure = boardProcedure.use(boardAdminCheck);
export const boardMemberProcedure = boardProcedure.use(boardMemberCheck);
