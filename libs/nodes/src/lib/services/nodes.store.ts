import { Injectable, Signal, inject } from '@angular/core';
import { TuNode, User } from '@team-up/board-commons';
import { Subject } from 'rxjs';
import { rxActions } from '@rx-angular/state/actions';
import { Store } from '@ngrx/store';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import type { NativeEmoji } from 'emoji-picker-element/shared';

@Injectable({
  providedIn: 'root',
})
export class NodesStore {
  #store = inject(Store);

  #focusNode$ = new Subject<{ id: string; ctrlKey: boolean }>();

  focusNode = this.#focusNode$.asObservable();

  actions = rxActions<{
    deleteNodes: { nodes: { id: string; type: string }[]; history?: boolean };
    copyNodes: { nodes: TuNode[] };
  }>();

  constructor() {
    this.actions.copyNodes$.subscribe(({ nodes }) => {
      navigator.clipboard.writeText(JSON.stringify(nodes));
    });

    this.actions.deleteNodes$.subscribe(({ nodes, history }) => {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: history ?? true,
          actions: nodes.map((node) => {
            return {
              data: {
                type: node.type,
                id: node.id,
              },
              op: 'remove',
            };
          }),
        }),
      );
    });
  }

  users!: Signal<User[]>;
  userId!: Signal<string>;
  zoom!: Signal<number>;
  privateId!: Signal<string>;
  canvasMode!: Signal<string>;
  nodes!: Signal<TuNode[]>;
  activeToolbarOption!: Signal<string>;
  emoji!: Signal<NativeEmoji | null>;
  userHighlight!: Signal<string | null>;
  userVotes!: Signal<string | null>;

  setFocusNode(event: { id: string; ctrlKey: boolean }) {
    this.#focusNode$.next(event);
  }
}
