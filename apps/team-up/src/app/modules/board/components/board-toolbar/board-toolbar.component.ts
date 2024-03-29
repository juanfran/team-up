import {
  Component,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import {
  selectCanvasMode,
  selectLayer,
  selectPopupOpen,
  selectPosition,
  selectUserId,
  selectZoom,
} from '../../selectors/page.selectors';
import { take, withLatestFrom } from 'rxjs/operators';
import { BoardMoveService } from '../../services/board-move.service';
import { NotesService } from '../../services/notes.service';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { v4 } from 'uuid';
import { Subscription, zip } from 'rxjs';
import 'emoji-picker-element';
import { EmojiClickEvent, NativeEmoji } from 'emoji-picker-element/shared';
import { MatDialog } from '@angular/material/dialog';
import { CocomaterialComponent } from '../cocomaterial/cocomaterial.component';
import { MatButtonModule } from '@angular/material/button';
import { AutoFocusDirective } from '../../directives/autofocus.directive';
import { MatInputModule } from '@angular/material/input';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { AsyncPipe } from '@angular/common';
import { RxLet } from '@rx-angular/template/let';
import { MatIconModule } from '@angular/material/icon';
import { TokenSelectorComponent } from '../token-selector/token-selector.component';
import { Token } from '@team-up/board-commons/models/token.model';
import { PollBoard, Text } from '@team-up/board-commons';
import { DrawingStore } from '@team-up/board-components/drawing/drawing.store';
import { TemplateSelectorComponent } from '../template-selector/template-selector.component';

interface State {
  popupOpen: string;
}

@Component({
  selector: 'team-up-board-toolbar',
  templateUrl: './board-toolbar.component.html',
  styleUrls: ['./board-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    RxLet,
    SvgIconComponent,
    ReactiveFormsModule,
    MatInputModule,
    AutoFocusDirective,
    MatButtonModule,
    AsyncPipe,
    MatIconModule,
    TokenSelectorComponent,
    TemplateSelectorComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BoardToolbarComponent {
  public readonly model$ = this.state.select();
  public canvasMode$ = this.store.select(selectCanvasMode);
  public imageForm = new FormGroup({
    url: new FormControl('', [Validators.required]),
  });
  public toolbarSubscription?: Subscription;
  public readonly layer = this.store.selectSignal(selectLayer);

  constructor(
    public state: RxState<State>,
    private store: Store,
    private boardMoveService: BoardMoveService,
    private notesService: NotesService,
    private dialog: MatDialog,
    private drawingStore: DrawingStore,
  ) {
    this.state.connect('popupOpen', this.store.select(selectPopupOpen));
  }

  public text() {
    this.popupOpen('text');

    this.store.dispatch(PageActions.textToolbarClick());

    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          const textPosition = {
            x: (-position.x + event.pageX) / zoom,
            y: (-position.y + event.pageY) / zoom,
          };

          const text: Text = {
            text: '<p></p>',
            position: textPosition,
            layer: this.layer(),
            width: 200,
            height: 50,
            rotation: 0,
          };

          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'text',
                    id: v4(),
                    content: text,
                  },
                  op: 'add',
                },
              ],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  public note() {
    if (this.state.get('popupOpen') === 'note') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('note');

    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
          this.store.select(selectUserId),
        ),
      )
      .subscribe({
        next: ([event, zoom, position, userId]) => {
          this.notesService.createNote(userId, {
            x: (-position.x + event.clientX) / zoom,
            y: (-position.y + event.clientY) / zoom,
          });
        },
        complete: () => this.popupOpen(''),
      });
  }

  public group() {
    if (this.state.get('popupOpen') === 'group') {
      this.popupOpen('');
      this.store.dispatch(
        PageActions.setInitZone({
          initZone: null,
        }),
      );
      return;
    }

    this.popupOpen('group');
    this.store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'group',
        },
      }),
    );
  }

  public vote() {
    if (this.state.get('popupOpen') !== 'vote') {
      this.popupOpen('vote');
      this.store.dispatch(PageActions.readyToVote());
    } else {
      this.popupOpen('');
    }
  }

  public draw() {
    if (this.state.get('popupOpen') !== 'draw') {
      this.popupOpen('draw');
      this.drawingStore.actions.readyToDraw();
    } else {
      this.popupOpen('');
      this.drawingStore.actions.finishDrawing();
    }
  }

  public search() {
    if (this.state.get('popupOpen') !== 'search') {
      this.popupOpen('search');
      this.store.dispatch(PageActions.readyToSearch());
    } else {
      this.popupOpen('');
    }
  }

  public cocomaterial() {
    if (this.state.get('popupOpen') !== 'cocomaterial') {
      this.popupOpen('cocomaterial');

      const dialogRef = this.dialog.open(CocomaterialComponent, {
        height: '900px',
        width: '800px',
        enterAnimationDuration: 0,
        exitAnimationDuration: 0,
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe(() => {
        this.popupOpen('');
      });
    } else {
      this.popupOpen('');
    }
  }

  public panel() {
    this.popupOpen('panel');
    this.store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'panel',
        },
      }),
    );
  }

  public poll() {
    if (this.state.get('popupOpen') === 'poll') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('poll');

    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          const poll: PollBoard = {
            title: '',
            layer: this.layer(),
            position: {
              x: (-position.x + event.pageX) / zoom,
              y: (-position.y + event.pageY) / zoom,
            },
            finished: false,
            options: [],
          };

          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'poll',
                    id: v4(),
                    content: poll,
                  },
                  op: 'add',
                },
              ],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  public emoji() {
    if (this.state.get('popupOpen') !== 'emoji') {
      this.popupOpen('emoji');
    } else {
      this.popupOpen('');
    }
  }

  public emojiSelected(emojiEvent: EmojiClickEvent) {
    this.store.dispatch(
      PageActions.selectEmoji({
        emoji: emojiEvent.detail.emoji as NativeEmoji,
      }),
    );
  }

  public token() {
    if (this.state.get('popupOpen') === 'token') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('token');
  }

  public estimation() {
    if (this.state.get('popupOpen') === 'estimation') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('estimation');

    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'estimation',
                    id: v4(),
                    content: {
                      layer: this.layer(),
                      position: {
                        x: (-position.x + event.pageX) / zoom,
                        y: (-position.y + event.pageY) / zoom,
                      },
                    },
                  },
                  op: 'add',
                },
              ],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  public tokenSelected(
    token: Pick<Token, 'backgroundColor' | 'color' | 'text'>,
  ) {
    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'token',
                    id: v4(),
                    content: {
                      ...token,
                      layer: this.layer(),
                      position: {
                        x: (-position.x + event.pageX) / zoom - 50,
                        y: (-position.y + event.pageY) / zoom - 50,
                      },
                    },
                  },
                  op: 'add',
                },
              ],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  public popupOpen(popupName: string) {
    this.store.dispatch(PageActions.setPopupOpen({ popup: popupName }));

    if (this.toolbarSubscription) {
      this.toolbarSubscription.unsubscribe();
      this.toolbarSubscription = undefined;
    }
  }

  public newImage() {
    const url = this.imageForm.get('url')?.value;
    if (this.imageForm.valid && url) {
      zip(this.store.select(selectZoom), this.store.select(selectPosition))
        .pipe(take(1))
        .subscribe(([zoom, position]) => {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'image',
                    id: v4(),
                    content: {
                      url,
                      layer: this.layer(),
                      position: {
                        x: -position.x / zoom,
                        y: -position.y / zoom,
                      },
                      rotation: 0,
                      width: 0,
                      height: 0,
                    },
                  },
                  op: 'add',
                },
              ],
            }),
          );
        });
    }

    this.imageForm.reset();
    this.popupOpen('');
  }

  public templateSelector() {
    if (this.state.get('popupOpen') === 'templates') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('templates');
  }

  public seletedTemplate() {
    this.popupOpen('');
  }
}
