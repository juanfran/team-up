import {
  Component,
  ChangeDetectionStrategy,
  Input,
  HostListener,
  ElementRef,
  QueryList,
  ViewChildren,
  AfterViewInit,
  OnInit,
  HostBinding,
  ChangeDetectorRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { filter, first, map, pluck, withLatestFrom } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { NodeType, Panel } from '@team-up/board-commons';
import { BoardMoveService } from '../../services/board-move.service';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { NgIf, AsyncPipe } from '@angular/common';
import { pageFeature } from '../../reducers/page.reducer';
import { Resizable } from '../../models/resizable.model';
import { ResizableDirective } from '../../directives/resize.directive';
import { ResizeHandlerDirective } from '../../directives/resize-handler.directive';

interface State {
  edit: boolean;
  panel: Panel;
  editText: string;
  focus: boolean;
  draggable: boolean;
  mode: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [NgIf, AsyncPipe, ResizeHandlerDirective],
})
export class PanelComponent
  implements AfterViewInit, OnInit, Draggable, Resizable
{
  @Input()
  public set panel(panel: Panel) {
    this.state.set({ panel });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('panel')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('panel')?.height ?? '0';
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly viewModel$ = this.state.select();

  @ViewChildren('textarea') textarea!: QueryList<ElementRef>;

  public nodeType: NodeType = 'panel';

  public get id() {
    return this.state.get('panel').id;
  }

  constructor(
    private el: ElementRef,
    private boardMoveService: BoardMoveService,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private resizableDirective: ResizableDirective,
    private cd: ChangeDetectorRef
  ) {
    this.state.set({ draggable: true });

    this.state.hold(this.state.select('focus'), () => this.cd.markForCheck());
    this.state.hold(this.state.select('edit'), (edit) =>
      this.state.set({ draggable: !edit })
    );
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    // prevent select word on dblclick
    if (!this.state.get('edit')) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('panel').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.edit();
    requestAnimationFrame(() => {
      this.focusTextarea();
    });
  }

  public edit() {
    this.state.set({
      edit: true,
      editText: this.state.get('panel').title,
    });

    this.state.connect(
      this.boardMoveService.mouseDown$.pipe(first()),
      (state) => {
        return {
          ...state,
          edit: false,
        };
      }
    );
  }

  public get position() {
    return this.state.get('panel').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public setText(event: Event) {
    if (event.target) {
      const value = (event.target as HTMLElement).innerText;

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: this.state.get('panel').id,
                  title: value,
                },
              },
              op: 'patch',
            },
          ],
        })
      );
    }
  }

  public selectElementContents(el: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  public selectTextarea($event: FocusEvent) {
    this.selectElementContents($event.target as HTMLElement);
  }

  public ngOnInit() {
    this.store
      .select(selectFocusId)
      .pipe(
        first(),
        withLatestFrom(
          this.store.select(pageFeature.selectAdditionalContext),
          this.state.select('panel').pipe(map((panel) => panel.id))
        ),
        filter(([id, context, panelId]) => {
          return id.includes(panelId) && context[panelId] !== 'pasted';
        }),
        untilDestroyed(this)
      )
      .subscribe(() => {
        this.edit();
      });

    this.boardDragDirective.setHost(this);
    this.resizableDirective.setHost(this);

    this.state
      .select('panel')
      .pipe(pluck('position'), untilDestroyed(this))
      .subscribe((position) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${position.x}px, ${position.y}px)`;
      });

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.panel.id),
      };
    });

    this.state.connect('mode', this.store.select(selectCanvasMode));

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'panel',
                  node: this.state.get('panel'),
                },
                op: 'remove',
              },
            ],
          })
        );
      }
    });
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }

  public focusTextarea() {
    if (this.textarea.first) {
      (this.textarea.first.nativeElement as HTMLTextAreaElement).focus();
    }
  }

  public newColor(e: Event) {
    if (e.target) {
      const color = (e.target as HTMLInputElement).value;

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: this.state.get('panel').id,
                  color,
                },
              },
              op: 'patch',
            },
          ],
        })
      );
    }
  }

  public ngAfterViewInit() {
    if (this.state.get('focus')) {
      this.focusTextarea();
    }
  }
}
