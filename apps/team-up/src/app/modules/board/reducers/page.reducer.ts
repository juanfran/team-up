import { Action, createFeature, createReducer, on } from '@ngrx/store';
import {
  Point,
  ZoneConfig,
  Zone,
  User,
  CocomaterialTag,
  CocomaterialApiListVectors,
} from '@team-up/board-commons';
import { wsOpen } from '@/app/modules/ws/ws.actions';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { produce } from 'immer';
import { NativeEmoji } from 'emoji-picker-element/shared';

export interface PageState {
  loaded: boolean;
  visible: boolean;
  focusId: string[];
  open: boolean;
  initZone: ZoneConfig | null;
  userId: string;
  boardId: string;
  zoom: number;
  position: Point;
  moveEnabled: boolean;
  zone: Zone | null;
  userHighlight: User['id'] | null;
  showUserVotes: User['id'] | null;
  canvasMode: string;
  popupOpen: string;
  isAdmin: boolean;
  owners: string[];
  boardCursor: string;
  voting: boolean;
  emoji: NativeEmoji | null;
  dragEnabled: boolean;
  drawing: boolean;
  drawingColor: string;
  drawingSize: number;
  cocomaterial: {
    page: number;
    tags: CocomaterialTag[];
    vectors: CocomaterialApiListVectors | null;
  };
  searching: boolean;
  additionalContext: Record<string, unknown>;
  follow: string;
  isPublic: boolean;
}

const initialPageState: PageState = {
  loaded: false,
  visible: true,
  focusId: [],
  open: false,
  initZone: null,
  boardId: '',
  zoom: 1,
  position: {
    x: 0,
    y: 0,
  },
  moveEnabled: true,
  zone: null,
  userHighlight: null,
  showUserVotes: null,
  canvasMode: 'editMode',
  popupOpen: '',
  isAdmin: false,
  owners: [],
  boardCursor: 'default',
  voting: false,
  userId: '',
  emoji: null,
  dragEnabled: true,
  drawing: false,
  drawingColor: '#000000',
  drawingSize: 5,
  cocomaterial: {
    page: 1,
    tags: [],
    vectors: null,
  },
  searching: false,
  additionalContext: {},
  follow: '',
  isPublic: false,
};

const reducer = createReducer(
  initialPageState,
  on(wsOpen, (state): PageState => {
    state.open = true;
    return state;
  }),
  on(PageActions.initBoard, (state, { userId }): PageState => {
    return {
      ...initialPageState,
      userId,
    };
  }),
  on(PageActions.closeBoard, (state): PageState => {
    return {
      ...initialPageState,
      userId: state.userId,
    };
  }),
  on(
    PageActions.fetchBoardSuccess,
    (state, { isAdmin, isPublic }): PageState => {
      state.isAdmin = isAdmin;
      state.isPublic = isPublic;
      state.loaded = true;

      return state;
    }
  ),
  on(PageActions.joinBoard, (state, { boardId }): PageState => {
    state.boardId = boardId;

    return state;
  }),
  on(PageActions.setUserView, (state, { zoom, position }): PageState => {
    state.zoom = zoom;
    state.position = position;

    return state;
  }),
  on(PageActions.setInitZone, (state, { initZone }): PageState => {
    state.initZone = initZone;

    return state;
  }),
  on(PageActions.setMoveEnabled, (state, { enabled }): PageState => {
    state.moveEnabled = enabled;

    return state;
  }),
  on(BoardActions.setVisible, (state, { visible }): PageState => {
    state.visible = visible;
    return state;
  }),
  on(BoardActions.batchNodeActions, (state, { actions }): PageState => {
    if (actions.length === 1) {
      const action = actions[0];

      if (action.op === 'add') {
        if (action.data.type === 'group' || action.data.type === 'panel') {
          state.initZone = null;
          state.moveEnabled = true;
          state.zone = null;
        } else if (action.data.type === 'text') {
          state.boardCursor = 'default';
        }
      } else if (action.op === 'remove') {
        const id = action.data.node.id;

        if (state.focusId.includes(id)) {
          state.focusId = state.focusId.filter((it) => it !== id);
        }
      }
    }
    return state;
  }),
  on(
    PageActions.setFocusId,
    (state, { focusId, ctrlKey = false }): PageState => {
      if (focusId && state.focusId.includes(focusId)) {
        return state;
      }

      if (ctrlKey) {
        state.focusId = state.focusId.filter((it) => !!it);
        state.focusId.push(focusId);
      } else {
        state.focusId = [focusId];
      }

      return state;
    }
  ),
  on(PageActions.setZone, (state, { zone }): PageState => {
    state.zone = zone;

    return state;
  }),
  on(BoardActions.setState, (state, { data }): PageState => {
    const currentUser = data.find(
      (it) => it.data.type === 'user' && it.data.node.id === state.userId
    ) as User | undefined;

    let visible = state.visible;

    if (currentUser) {
      visible = currentUser.visible;
    }

    return {
      ...state,
      visible,
    };
  }),
  on(PageActions.changeCanvasMode, (state, { canvasMode }): PageState => {
    state.canvasMode = canvasMode;
    state.focusId = [];

    return state;
  }),
  on(PageActions.toggleUserHighlight, (state, { id }): PageState => {
    state.showUserVotes = null;

    if (state.userHighlight === id) {
      state.userHighlight = null;
    } else {
      state.userHighlight = id;
    }

    return state;
  }),
  on(PageActions.toggleShowVotes, (state, { userId }): PageState => {
    state.userHighlight = null;

    if (state.showUserVotes === userId) {
      state.showUserVotes = null;
    } else {
      state.showUserVotes = userId;
    }

    return state;
  }),
  on(PageActions.stopHighlight, (state): PageState => {
    state.userHighlight = null;
    state.showUserVotes = null;

    return state;
  }),
  on(PageActions.setPopupOpen, (state, { popup }): PageState => {
    state.popupOpen = popup;

    state.emoji = null;
    state.boardCursor = 'default';
    state.voting = false;
    state.dragEnabled = true;
    state.drawing = false;
    state.searching = false;

    if (popup.length) {
      state.initZone = null;
    }

    return state;
  }),
  on(PageActions.textToolbarClick, (state): PageState => {
    state.boardCursor = 'text';
    return state;
  }),
  on(PageActions.readyToVote, (state): PageState => {
    if (state.voting) {
      state.voting = false;
    } else {
      state.voting = true;
    }
    return state;
  }),
  on(PageActions.selectEmoji, (state, { emoji }): PageState => {
    state.boardCursor = 'crosshair';
    state.emoji = emoji;

    return state;
  }),
  on(PageActions.fetchCocomaterialTagsSuccess, (state, { tags }): PageState => {
    state.cocomaterial.tags = tags;

    return state;
  }),
  on(PageActions.fetchVectorsSuccess, (state, { vectors, page }): PageState => {
    if (page === 1) {
      state.cocomaterial.vectors = vectors;
    } else if (state.cocomaterial.vectors) {
      state.cocomaterial.vectors = {
        ...vectors,
        results: [...state.cocomaterial.vectors.results, ...vectors.results],
      };
    }

    state.cocomaterial.page = page;

    return state;
  }),
  on(PageActions.readyToDraw, (state): PageState => {
    state.dragEnabled = false;
    state.drawing = true;

    return state;
  }),
  on(PageActions.readyToSearch, (state): PageState => {
    state.searching = true;

    return state;
  }),
  on(PageActions.setDrawingParams, (state, { size, color }): PageState => {
    state.drawingColor = color;
    state.drawingSize = size;

    return state;
  }),
  on(PageActions.pasteNodes, (state, { nodes }): PageState => {
    nodes.forEach((it) => {
      state.additionalContext[it.node.id] = 'pasted';
    });

    state.focusId = nodes.map((it) => it.node.id);

    return state;
  }),
  on(PageActions.followUser, (state, { id }): PageState => {
    if (state.follow === id) {
      state.follow = '';
    } else {
      state.follow = id;
    }

    if (state.follow) {
      state.moveEnabled = false;
    } else {
      state.moveEnabled = true;
    }

    return state;
  }),
  on(PageActions.setBoardPrivacy, (state, { isPublic }): PageState => {
    state.isPublic = isPublic;

    return state;
  })
);

export const pageFeature = createFeature({
  name: 'page',
  reducer: (state: PageState = initialPageState, action: Action) => {
    return produce(state, (draft: PageState) => {
      return reducer(draft, action);
    });
  },
});
