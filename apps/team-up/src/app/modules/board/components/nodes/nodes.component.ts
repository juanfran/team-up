import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { NodesStore } from '@team-up/nodes/services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  selectUserId,
  selectZoom,
  selectPrivateId,
  selectCanvasMode,
  selectPopupOpen,
  selectEmoji,
  selectUserHighlight,
  selectShowUserVotes,
} from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';

@Component({
  selector: 'team-up-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: ` <team-up-node
    *rxFor="let node of nodes$; trackBy: 'id'"
    [node]="node" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RxFor, NodeComponent],
  providers: [],
})
export class NodesComponent {
  private boardFacade = inject(BoardFacade);
  private nodesStore = inject(NodesStore);
  private store = inject(Store);

  public nodes$ = this.boardFacade.getNodes().pipe(
    map((it) => {
      return it.filter((it) => !['user', 'settings'].includes(it.type));
    }),
  );

  constructor() {
    // todo: find a better way to connect page state with nodes state, work for standalone nodes
    this.boardFacade
      .getUsers()
      .pipe(takeUntilDestroyed())
      .subscribe((users) => {
        this.nodesStore.users$.next(users.map((it) => it.content));
      });

    this.store
      .select(selectUserId)
      .pipe(takeUntilDestroyed())
      .subscribe((userId) => {
        this.nodesStore.userId$.next(userId);
      });

    this.store
      .select(selectPrivateId)
      .pipe(takeUntilDestroyed())
      .subscribe((privateId) => {
        this.nodesStore.privateId$.next(privateId);
      });

    this.store
      .select(selectZoom)
      .pipe(takeUntilDestroyed())
      .subscribe((zoom) => {
        this.nodesStore.zoom$.next(zoom);
      });

    this.store
      .select(selectCanvasMode)
      .pipe(takeUntilDestroyed())
      .subscribe((canvasMode) => {
        this.nodesStore.canvasMode$.next(canvasMode);
      });

    this.boardFacade
      .getNodes()
      .pipe(takeUntilDestroyed())
      .subscribe((nodes) => {
        this.nodesStore.nodes$.next(nodes);
      });

    this.nodesStore.focusNode.subscribe((event) => {
      this.store.dispatch(
        PageActions.setFocusId({
          focusId: event.id,
          ctrlKey: event.ctrlKey,
        }),
      );
    });

    this.store
      .select(selectPopupOpen)
      .pipe(takeUntilDestroyed())
      .subscribe((popupOpen) => {
        this.nodesStore.activeToolbarOption$.next(popupOpen);
      });

    this.store
      .select(selectEmoji)
      .pipe(takeUntilDestroyed())
      .subscribe((emoji) => {
        this.nodesStore.emoji$.next(emoji);
      });

    this.store
      .select(selectUserHighlight)
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.nodesStore.userHighlight$.next(user);
      });

    this.store
      .select(selectShowUserVotes)
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.nodesStore.userVotes$.next(user);
      });
  }
}
