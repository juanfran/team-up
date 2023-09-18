import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  OnInit,
  ViewChild,
  HostBinding,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { filter, first, map, take, withLatestFrom } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { NodeType, Text } from '@team-up/board-commons';
import { selectFocusId } from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { BoardMoveService } from '../../services/board-move.service';
import { NgIf, AsyncPipe } from '@angular/common';
import { pageFeature } from '../../reducers/page.reducer';
import { Resizable } from '../../models/resizable.model';
import { ResizeHandlerDirective } from '../../directives/resize-handler.directive';
import { ResizableDirective } from '../../directives/resize.directive';

interface State {
  node: Text;
  draggable: boolean;
  focus: boolean;
  edit: boolean;
  editText: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [NgIf, AsyncPipe, ResizeHandlerDirective],
})
export class TextComponent
  implements OnInit, Draggable, AfterViewInit, Resizable
{
  @Input()
  public set text(node: Text) {
    this.state.set({ node });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('node')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('node')?.height ?? '0';
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly viewModel$ = this.state.select().pipe(
    map((state) => {
      return {
        toolbar: state.focus && !state.edit,
        ...state,
      };
    })
  );

  @ViewChild('textarea') textarea!: ElementRef;

  public plugins = [
    'advlist',
    'autolink',
    'lists',
    'link',
    'charmap',
    'anchor',
    'visualblocks',
    'code',
  ];

  public toolbar = [
    `bold italic | fontsize |
    alignleft aligncenter alignright alignjustify |
    bullist numlist outdent indent`,
  ];

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private boardMoveService: BoardMoveService,
    private resizableDirective: ResizableDirective
  ) {
    this.state.set({ draggable: true, edit: false });
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('node').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  public get position() {
    return this.state.get('node').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public nodeType: NodeType = 'text';

  public get id() {
    return this.state.get('node').id;
  }

  public get nativeElement() {
    return this.el.nativeElement as HTMLElement;
  }

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
      editText: this.state.get('node').text,
    });

    this.state.connect(
      this.boardMoveService.mouseDown$.pipe(take(1)),
      (state) => {
        const value = (this.textarea.nativeElement as HTMLElement).innerText;

        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'text',
                  node: {
                    id: this.state.get('node').id,
                    text: value.trim(),
                  },
                },
                op: 'patch',
              },
            ],
          })
        );

        return {
          ...state,
          edit: false,
        };
      }
    );
  }

  public focusTextarea() {
    if (this.textarea.nativeElement) {
      (this.textarea.nativeElement as HTMLTextAreaElement).focus();
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
                type: 'text',
                node: {
                  id: this.state.get('node').id,
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

  public newSize(e: Event) {
    if (e.target) {
      const size = Number((e.target as HTMLInputElement).value);

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'text',
                node: {
                  id: this.state.get('node').id,
                  size,
                },
              },
              op: 'patch',
            },
          ],
        })
      );
    }
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);
    this.resizableDirective.setHost(this);

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.node.id),
      };
    });

    this.store
      .select(selectFocusId)
      .pipe(
        first(),
        withLatestFrom(
          this.store.select(pageFeature.selectAdditionalContext),
          this.state.select('node').pipe(map((node) => node.id))
        ),
        filter(([id, context, nodeId]) => {
          return id.includes(nodeId) && context[nodeId] !== 'pasted';
        }),
        untilDestroyed(this)
      )
      .subscribe(() => {
        this.edit();
      });

    this.state
      .select('node')
      .pipe(
        map((it) => it.position),
        untilDestroyed(this)
      )
      .subscribe((position) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${position.x}px, ${position.y}px)`;
      });

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'text',
                  node: this.state.get('node'),
                },
                op: 'remove',
              },
            ],
          })
        );
      }
    });

    this.state.hold(this.state.select('node'), (node) => {
      this.el.nativeElement.style.setProperty('--size', `${node.size}px`);
      this.el.nativeElement.style.setProperty('--color', node.color);
    });
  }

  public ngAfterViewInit(): void {
    if (this.state.get('focus')) {
      this.focusTextarea();
    }
  }
}
