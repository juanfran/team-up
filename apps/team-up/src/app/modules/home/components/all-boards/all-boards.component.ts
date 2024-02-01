import { TitleComponent } from '../../../../shared/title/title.component';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { RxState } from '@rx-angular/state';
import { BoardUser } from '@team-up/board-commons';
import { BoardListComponent } from '../board-list/board-list.component';
import { homeFeature } from '../../+state/home.feature';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CreateBoardComponent } from '../create-board/create-board.component';
import { filter } from 'rxjs';
interface State {
  boards: BoardUser[];
}

@Component({
  selector: 'team-up-all-boards',
  styleUrls: ['./all-boards.component.scss'],
  template: `
    <team-up-title title="Boards"></team-up-title>
    <team-up-board-list-header [showCreate]="!!boards().length">
      <h1>Boards</h1>
    </team-up-board-list-header>
    @if (boards().length) {
      <team-up-board-list [boards]="boards()"></team-up-board-list>
    } @else if (!loading()) {
      <div class="empty">
        <h1>No boards</h1>
        <button
          mat-flat-button
          color="primary"
          (click)="createBoard()">
          Create your first board
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
    MatButtonModule,
  ],
})
export class AllBoardsComponent {
  private state = inject(RxState) as RxState<State>;
  private store = inject(Store);
  private dialog = inject(MatDialog);

  boards = this.store.selectSignal(homeFeature.selectBoards);
  loading = this.store.selectSignal(homeFeature.selectLoadingBoards);

  constructor() {
    this.store.dispatch(HomeActions.initAllBoardsPage());
  }

  public createBoard() {
    const dialogRef = this.dialog.open(CreateBoardComponent, {
      width: '400px',
      data: {
        teamId: null,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newBoard) => {
        this.store.dispatch(
          HomeActions.createBoard({
            name: newBoard.name,
          }),
        );
      });
  }
}
