import { eq, and, or, desc, notInArray } from 'drizzle-orm';
import { db } from './init-db';
import * as schema from '../schema';
import type { TuNode, UserNode } from '@team-up/board-commons';
import { SetNonNullable } from 'type-fest';
import * as team from './team-db';
import { getUserTeam } from './team-db';

export async function getBoard(boardId: string) {
  const results = await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId));

  return results.at(0);
}

export async function updateLastAccessedAt(boardId: string, userId: string) {
  return db
    .update(schema.acountsToBoards)
    .set({ lastAccessedAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );
}

export async function haveAccess(boardId: string, userId: string) {
  const board = await getBoard(boardId);

  if (!board) {
    return false;
  }

  if (board?.public) {
    return true;
  }

  const boardUser = await getBoardUser(boardId, userId);

  if (boardUser?.role === 'admin') {
    return true;
  }

  if (board?.teamId) {
    const teamMembers = await team.getTeamMembers(board?.teamId);
    const member = teamMembers.find((it) => it.id === userId);

    if (member) {
      return true;
    }
  }

  return false;
}

export async function setBoardPrivacy(boardId: string, isPublic: boolean) {
  return db
    .update(schema.boards)
    .set({ public: isPublic })
    .where(eq(schema.boards.id, boardId));
}

export async function getBoardAdmins(boardId: string) {
  const ids = new Set<string>();

  const boards = await db
    .select()
    .from(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.role, 'admin')
      )
    );

  boards.forEach((board) => {
    ids.add(board.accountId);
  });

  const teamAdmins = await team.getTeamAdmins(boardId);

  teamAdmins.forEach((team) => {
    ids.add(team.accountId);
  });

  return Array.from(ids);
}

export async function getBoardUser(boardId: string, userId: UserNode['id']) {
  const results = await db
    .select()
    .from(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.accountId, userId)
      )
    );

  return results.at(0);
}

export async function getBoards(userId: string) {
  const teams = await team.getUserTeams(userId);
  const teamBoards = [];

  for (const team of teams) {
    const boards = await getUsersBoardsByTeam(userId, team.id);

    teamBoards.push(...boards);
  }

  const ids = teamBoards.map((it) => it.id);
  const inArray = ids.length ? notInArray(schema.boards.id, ids) : undefined;

  const boardsRaw = await db
    .select()
    .from(schema.boards)
    .leftJoin(
      schema.acountsToBoards,
      and(
        eq(schema.boards.id, schema.acountsToBoards.boardId),
        eq(schema.acountsToBoards.accountId, userId)
      )
    )
    .leftJoin(
      schema.starreds,
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, schema.boards.id)
      )
    )
    .where(
      and(
        or(
          eq(schema.boards.public, true),
          eq(schema.acountsToBoards.role, 'admin')
        ),
        inArray
      )
    );

  const boards = boardsRaw
    .filter((it): it is SetNonNullable<typeof it> => !!it.accounts_boards)
    .map((result) => ({
      id: result.boards.id,
      name: result.boards.name,
      teamId: result.boards.teamId,
      createdAt: result.boards.createdAt,
      role: result.accounts_boards.role,
      starred: !!result.starreds,
      lastAccessedAt:
        result.accounts_boards.lastAccessedAt ?? result.boards.createdAt,
    }));

  const finalBoards = [...boards, ...teamBoards];

  finalBoards.sort((a, b) => {
    if (a.createdAt > b.createdAt) {
      return -1;
    }

    return 1;
  });

  return finalBoards;
}

export async function getBoardUsers(boardId: string) {
  const results = await db
    .select({
      id: schema.acountsToBoards.accountId,
      visible: schema.acountsToBoards.visible,
      role: schema.acountsToBoards.role,
      accounts: {
        name: schema.accounts.name,
      },
    })
    .from(schema.acountsToBoards)
    .leftJoin(
      schema.accounts,
      eq(schema.accounts.id, schema.acountsToBoards.accountId)
    )
    .where(eq(schema.acountsToBoards.boardId, boardId));

  return results
    .filter((it): it is SetNonNullable<typeof it> => !!it.accounts)
    .map((result) => ({
      id: result.id,
      visible: result.visible,
      name: result.accounts.name,
      role: result.role,
    }));
}

export async function getBoardsByTeam(teamId: string) {
  return await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.teamId, teamId))
    .orderBy(desc(schema.boards.createdAt));
}

export async function getUsersBoardsByTeam(userId: string, teamId: string) {
  const userTeam = await getUserTeam(teamId, userId);

  if (!userTeam) {
    return [];
  }

  const results = await db
    .select()
    .from(schema.boards)
    .leftJoin(
      schema.starreds,
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, schema.boards.id)
      )
    )
    .leftJoin(
      schema.acountsToBoards,
      and(
        eq(schema.boards.id, schema.acountsToBoards.boardId),
        eq(schema.acountsToBoards.accountId, userId)
      )
    )
    .where(eq(schema.boards.teamId, teamId))
    .orderBy(desc(schema.boards.createdAt));

  return results.map((result) => ({
    id: result.boards.id,
    name: result.boards.name,
    createdAt: result.boards.createdAt,
    role: userTeam.role,
    starred: !!result.starreds,
    teamId: result.boards.teamId,
    lastAccessedAt:
      result.accounts_boards?.lastAccessedAt ?? result.boards.createdAt,
  }));
}

export async function getAllBoardAdmins(boardId: string) {
  const board = await getBoard(boardId);

  if (!board) {
    return [];
  }

  let teamAdmins: string[] = [];

  if (board.teamId) {
    teamAdmins = (await team.getTeamAdmins(board.teamId)).map(
      (it) => it.accountId
    );
  }

  const boardAdmins = await getBoardAdmins(boardId);

  const admins = [...teamAdmins, ...boardAdmins];

  return admins;
}

export async function createBoard(
  name = 'New board',
  ownerId: string,
  board: TuNode[],
  teamId: string | null
) {
  const result = await db
    .insert(schema.boards)
    .values({ name, board, teamId })
    .returning();

  await db.insert(schema.acountsToBoards).values({
    accountId: ownerId,
    boardId: result[0].id,
    role: 'admin',
    visible: false,
  });

  return result[0];
}

export async function deleteBoard(boardId: string) {
  return db.delete(schema.boards).where(eq(schema.boards.id, boardId));
}

export async function leaveBoard(userId: string, boardId: string) {
  return db
    .delete(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );
}

export async function joinBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const result = await db
    .select()
    .from(schema.boards)
    .leftJoin(
      schema.acountsToBoards,
      eq(schema.boards.id, schema.acountsToBoards.boardId)
    )
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );

  if (result && !result.length) {
    await db.insert(schema.acountsToBoards).values({
      accountId: userId,
      boardId,
      visible: false,
    });
  }
}

export async function updateBoard(id: string, board: TuNode[]) {
  if (!board) {
    console.trace();
  }

  return db
    .update(schema.boards)
    .set({ board })
    .where(eq(schema.boards.id, id));
}

export async function updateAccountBoard(
  boardId: string,
  userId: UserNode['id'],
  visible: boolean
) {
  return db
    .update(schema.acountsToBoards)
    .set({ visible })
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );
}

export async function rename(id: string, name: string) {
  return db.update(schema.boards).set({ name }).where(eq(schema.boards.id, id));
}

export async function changeRole(
  boardId: string,
  userId: string,
  role: 'admin' | 'member'
) {
  return db
    .update(schema.acountsToBoards)
    .set({ role })
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.accountId, userId)
      )
    );
}

export async function deleteMember(boardId: string, userId: string) {
  return db
    .delete(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.accountId, userId)
      )
    );
}

export async function updateBoardName(boardId: string, name: string) {
  return db
    .update(schema.boards)
    .set({ name })
    .where(eq(schema.boards.id, boardId));
}

export async function getStarredBoards(userId: string) {
  const boards = await getBoards(userId);

  return boards.filter((it) => it.starred);
}

export async function addStarredBoard(userId: string, boardId: string) {
  return db.insert(schema.starreds).values({
    accountId: userId,
    boardId,
  });
}

export async function removeStarredBoard(userId: string, boardId: string) {
  return db
    .delete(schema.starreds)
    .where(
      and(
        eq(schema.starreds.accountId, userId),
        eq(schema.starreds.boardId, boardId)
      )
    );
}

export async function transferBoard(boardId: string, teamId: string | null) {
  return db
    .update(schema.boards)
    .set({ teamId })
    .where(eq(schema.boards.id, boardId));
}
