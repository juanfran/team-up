import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, tap } from 'rxjs/operators';
import { PageActions } from '../actions/page.actions';
import { StateActions } from '@team-up/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';
import { isInputField } from '@team-up/cdk/utils/is-input-field';
import { BoardActions } from '../actions/board.actions';
import { NodesActions } from '@team-up/nodes/services/nodes-actions';
import { NodesStore } from '@team-up/nodes/services/nodes.store';

@Injectable()
export class HistoryEffects {
  #boardFacade = inject(BoardFacade);
  #actions$ = inject(Actions);
  #nodesActions = inject(NodesActions);
  #nodesStore = inject(NodesStore);

  undo$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(PageActions.undo),
      filter(() => {
        return !isInputField();
      }),
      map(() => {
        const actions = this.#boardFacade.undo();

        return BoardActions.batchNodeActions({
          history: false,
          actions,
        });
      }),
    );
  });

  redo$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(PageActions.redo),
      filter(() => {
        return !isInputField();
      }),
      map(() => {
        const actions = this.#boardFacade.redo();
        return BoardActions.batchNodeActions({
          history: false,
          actions,
        });
      }),
    );
  });

  endDrag$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(PageActions.endDragNode),
        tap((actions) => {
          const nodesActions = actions.nodes.map((node) => {
            return {
              data: {
                type: node.nodeType,
                id: node.id,
                content: {
                  position: node.initialPosition,
                },
              },
              position: node.initialIndex,
              op: 'patch',
            };
          }) as StateActions[];

          this.#boardFacade.patchHistory((history) => {
            history.past.unshift(nodesActions);
            history.future = [];

            return history;
          });
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  snapShot$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(PageActions.nodeSnapshot),
        tap((action) => {
          this.#boardFacade.patchHistory((history) => {
            history.past.unshift([
              {
                data: {
                  type: action.prev.type,
                  id: action.prev.id,
                  content: action.prev.content,
                },
                op: 'patch',
              } as StateActions,
            ]);
            history.future = [];

            return history;
          });
        }),
      );
    },
    {
      dispatch: false,
    },
  );
}
