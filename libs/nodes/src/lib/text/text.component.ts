import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  HostListener,
  signal,
  inject,
  Injector,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Text, TuNode } from '@team-up/board-commons';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import { HistoryService } from '../services/history.service';
import { NodeSpaceComponent } from '../node-space';
import { ToolbarComponent } from '@team-up/ui/toolbar';
import { EditorViewComponent } from '@team-up/ui/editor-view';
import { filter, pairwise } from 'rxjs';
import { SafeHtmlPipe } from '@team-up/cdk/pipes/safe-html';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-text',

  template: `
    <team-up-node-space
      [node]="node()"
      [resize]="true"
      [rotate]="true"
      [enabled]="!edit() && focus()">
      @if (!edit()) {
        <div
          class="rich-text"
          [innerHTML]="node().content.text | safeHtml"></div>
      } @else {
        <team-up-editor-view
          [class.readonly]="!edit()"
          #editorView="editorView"
          [node]="node()"
          [toolbar]="edit()"
          [content]="node().content.text"
          [focus]="edit()"
          (contentChange)="newContent.set($event)" />
      }
    </team-up-node-space>
  `,
  styleUrls: ['./text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [
    NodeSpaceComponent,
    ToolbarComponent,
    EditorViewComponent,
    SafeHtmlPipe,
  ],

  host: {
    '[class.focus]': 'focus()',
    '[class.toolbar]': 'edit()',
  },
})
export class TextComponent implements OnInit {
  private injector = inject(Injector);
  private historyService = inject(HistoryService);
  private store = inject(Store);

  public node = input.required<TuNode<Text>>();

  public pasted = input.required<boolean>();

  public focus = input.required<boolean>();

  public edit = signal(false);
  public editText = signal('');
  public newContent = signal('');

  @HostListener('dblclick', ['$event'])
  public mousedown(event: MouseEvent) {
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();

      this.startEdit();
    }
  }

  public startEdit() {
    this.historyService.initEdit(this.node());
    this.edit.set(true);
    this.newContent.set(this.node().content.text);
  }

  public ngOnInit() {
    toObservable(this.node, {
      injector: this.injector,
    }).subscribe((node) => {
      this.editText.set(node.content.text);
    });

    const focus$ = toObservable(this.focus, {
      injector: this.injector,
    });

    focus$
      .pipe(
        pairwise(),
        filter(([prev, next]) => prev && !next),
      )
      .subscribe(() => {
        if (!this.focus() && this.edit()) {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'text',
                    id: this.node().id,
                    content: {
                      text: this.newContent(),
                    },
                  },
                  op: 'patch',
                },
              ],
            }),
          );

          // delay to prevent flickering with the old content
          requestAnimationFrame(() => {
            this.cancelEdit();
          });
        }
      });

    if (this.focus() && !this.pasted()) {
      this.startEdit();
    }
  }

  public cancelEdit() {
    if (this.edit()) {
      this.historyService.finishEdit(this.node());
      this.edit.set(false);
    }
  }
}
