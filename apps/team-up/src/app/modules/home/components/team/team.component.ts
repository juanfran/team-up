import { TitleComponent } from '@/app/shared/title/title.component';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Board, UserTeam } from '@team-up/board-commons';
import { homeFeature } from '../../+state/home.feature';
import { combineLatest, filter, map } from 'rxjs';

import { filterNil } from '@/app/commons/operators/filter-nil';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmComponent } from '@/app/shared/confirm-action/confirm-actions.component';
import { HomeActions } from '../../+state/home.actions';
import { TeamMembersComponent } from '../team-members/team-members.component';
import { RenameTeamComponent } from '../rename-team/rename-team.component';
import { MatButtonModule } from '@angular/material/button';
import { BoardListComponent } from '../board-list/board-list.component';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';

interface State {
  teamId: string;
  team: UserTeam;
  boards: Board[];
}

@Component({
  selector: 'team-up-team',
  styleUrls: ['./team.component.scss'],
  template: `
    <ng-container *ngIf="model$ | async as vm">
      <ng-container *ngIf="vm.team">
        <team-up-title [title]="'Team ' + vm.team.name"></team-up-title>
        <team-up-board-list-header [teamId]="vm.team.id">
          <div class="team-name">
            <h1>{{ vm.team.name }}</h1>

            <button
              tuIconButton
              [matMenuTriggerFor]="menu"
              color="primary"
              aria-label="Teams settings">
              <mat-icon>more_vert </mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button
                (click)="leaveTeam()"
                mat-menu-item
                *ngIf="vm.team.teamMember.role !== 'admin'">
                <mat-icon>logout</mat-icon>
                <span>Leave</span>
              </button>

              <ng-container *ngIf="vm.team.teamMember.role === 'admin'">
                <button
                  mat-menu-item
                  (click)="rename()">
                  <mat-icon>edit</mat-icon>
                  <span>Rename</span>
                </button>
                <button
                  mat-menu-item
                  (click)="openMembers()">
                  <mat-icon>person_add</mat-icon>
                  <span>Members</span>
                </button>
                <button
                  mat-menu-item
                  (click)="deleteTeam()">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </ng-container>
            </mat-menu>
          </div>
        </team-up-board-list-header>

        <team-up-board-list [boards]="vm.boards"></team-up-board-list>
      </ng-container>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TitleComponent,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatButtonModule,
    BoardListComponent,
    BoardListHeaderComponent,
  ],
})
export class TeamComponent {
  private state = inject(RxState) as RxState<State>;
  private store = inject(Store);
  private dialog = inject(MatDialog);

  public model$ = this.state.select();

  @Input() set id(id: string) {
    this.state.set({ teamId: id });
  }

  constructor() {
    this.state.hold(this.state.select('team'), (team) => {
      this.store.dispatch(HomeActions.initTeamPage({ teamId: team.id }));
    });

    this.state.connect(
      'team',
      combineLatest({
        teamId: this.state.select('teamId'),
        teams: this.store.select(homeFeature.selectTeams),
      }).pipe(
        map(({ teamId, teams }) => teams.find((team) => team.id === teamId)),
        filterNil()
      )
    );

    this.state.connect('boards', this.store.select(homeFeature.selectBoards));
  }

  public deleteTeam() {
    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: {
        title: 'Delete team?',
        description:
          'All boards and data will be deleted. This action cannot be undone.',
        confirm: {
          text: 'Delete account',
          color: 'warn',
        },
        cancel: {
          text: 'Cancel',
          color: 'basic',
        },
        align: 'end',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe(() => {
        this.store.dispatch(
          HomeActions.deleteTeam({ id: this.state.get('teamId') })
        );
      });
  }

  public rename() {
    const dialogRef = this.dialog.open(RenameTeamComponent, {
      width: '400px',
      autoFocus: 'dialog',
      data: {
        name: this.state.get('team').name,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((name) => {
        this.store.dispatch(
          HomeActions.renameTeam({
            id: this.state.get('teamId'),
            name,
          })
        );
      });
  }

  public openMembers() {
    this.dialog.open(TeamMembersComponent, {
      width: '970px',
      autoFocus: 'dialog',
      data: {
        title: 'Team members',
        teamId: this.state.get('teamId'),
      },
    });
  }

  public leaveTeam() {
    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: {
        title: 'Are you sure?',
        confirm: {
          text: 'Leave team',
          color: 'warn',
        },
        cancel: {
          text: 'Cancel',
          color: 'basic',
        },
        align: 'end',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe(() => {
        this.store.dispatch(
          HomeActions.leaveTeam({ id: this.state.get('teamId') })
        );
      });
  }
}