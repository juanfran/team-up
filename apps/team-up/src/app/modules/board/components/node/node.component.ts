import { loadNode } from '../../../../register-node';

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  ElementRef,
  Input,
  ViewChild,
  ViewContainerRef,
  Type,
  HostListener,
  ComponentRef,
  HostBinding,
  signal,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Point, TuNode } from '@team-up/board-commons';
import { distinctUntilChanged, map, take } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectFocusId } from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';
import { pageFeature } from '../../reducers/page.reducer';
import { DynamicComponent } from './dynamic-component';
import { filterNil } from 'ngxtension/filter-nil';
import { compose, rotateDEG, translate, toCSS } from 'transformation-matrix';
import { NodeStore } from '@team-up/nodes/node/node.store';

interface State {
  position: {
    point: Point;
    rotation: number;
  };
  size: {
    width: number;
    height: number;
  };
  node: TuNode<{
    position: Point;
    layer: number;
    rotation?: number;
    width?: number;
    height?: number;
  }>;
  focus: boolean;
}

@Component({
  selector: 'team-up-node',
  styleUrls: ['./node.component.scss'],
  template: ' <ng-container #nodeHost></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  providers: [RxState, NodeStore],
  host: {
    '[class.highlight]': 'hightlight()',
  },
})
export class NodeComponent implements OnInit {
  readonly #nodeStore = inject(NodeStore);
  state = inject(RxState) as RxState<State>;
  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);
  private cmp?: ComponentRef<DynamicComponent>;

  @HostBinding('class') get layer() {
    return `layer-${this.state.get('node').content.layer}`;
  }

  @Input({ required: true })
  public set node(node: TuNode) {
    this.state.set({ node: node as State['node'] });
  }

  @ViewChild('nodeHost', { read: ViewContainerRef })
  public nodeHost!: ViewContainerRef;

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('node').id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  public hightlight = this.#nodeStore.highlight;

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public ngOnInit() {
    loadNode(this.state.get('node').type).then((node) => {
      this.loadComponent(node.component as Type<DynamicComponent>);
    });

    this.positionState();

    this.state.connect(
      'focus',
      this.store
        .select(selectFocusId)
        .pipe(map((it) => it.includes(this.state.get('node').id))),
    );
  }

  private positionState() {
    this.state.hold(this.state.select('node'), (node) => {
      const content = node.content;

      this.state.set({
        position: {
          point: content.position,
          rotation: content?.rotation ?? 0,
        },
      });

      if ('width' in node.content && 'height' in node.content) {
        this.state.set({
          size: {
            width: node.content.width as number,
            height: node.content.height as number,
          },
        });
      }
    });

    this.state.hold(
      this.state.select('position').pipe(
        distinctUntilChanged((prev, cur) => {
          return (
            prev.point.x === cur.point.x &&
            prev.point.y === cur.point.y &&
            prev.rotation === cur.rotation
          );
        }),
        filterNil(),
      ),
      ({ point, rotation }) => {
        this.nativeElement.style.transform = toCSS(
          compose(translate(point.x, point.y), rotateDEG(rotation)),
        );
      },
    );

    this.state.hold(
      this.state.select('size').pipe(
        distinctUntilChanged(
          (prev, cur) => prev.width === cur.width && prev.height === cur.height,
        ),
        filterNil(),
      ),
      (size) => {
        this.nativeElement.style.width = `${size.width}px`;
        this.nativeElement.style.height = `${size.height}px`;
      },
    );

    this.state.hold(
      this.store.select(pageFeature.selectCanvasMode),
      (layer) => {
        this.#nodeStore.updateState({
          layer: layer === 'editMode' ? 0 : 1,
        });
      },
    );
  }

  preventDelete() {
    const instance = this.cmp?.instance;

    if (instance?.preventDelete?.()) {
      return true;
    }

    return false;
  }

  private loadComponent(component: Type<DynamicComponent>) {
    this.store
      .select(pageFeature.selectAdditionalContext)
      .pipe(take(1))
      .subscribe((context) => {
        const pasted = signal(context[this.state.get('node').id] === 'pasted');
        this.cmp = this.nodeHost.createComponent(component);

        this.cmp.setInput('node', this.state.signal('node'));
        this.cmp.setInput('focus', this.state.signal('focus'));
        this.cmp.setInput('pasted', pasted);

        this.#nodeStore.updateState({
          pasted: false,
          node: this.state.get('node'),
          focus: this.state.get('focus'),
        });

        const zIndex = (this.cmp.instance as { zIndex?: number })?.zIndex ?? 1;

        this.nativeElement.style.setProperty('--z-index-node', zIndex);
      });
  }
}
