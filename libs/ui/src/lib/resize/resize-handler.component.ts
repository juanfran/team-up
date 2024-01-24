import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoveService } from '@team-up/cdk/services/move.service';
import { Resizable, ResizePosition, TuNode } from '@team-up/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filterNil } from 'ngxtension/filter-nil';
import { ResizeService } from './resize.service';

@Component({
  selector: 'team-up-resize-handler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #topLeft
      [style.transform]="'scale(' + scale + ')'"
      class="no-drag resize-point top-left"></div>
    <div
      #topRight
      [style.transform]="'scale(' + scale + ')'"
      class="no-drag resize-point top-right"></div>
    <div
      #bottomLeft
      [style.transform]="'scale(' + scale + ')'"
      class="no-drag resize-point bottom-left"></div>
    <div
      #bottomRight
      [style.transform]="'scale(' + scale + ')'"
      class="no-drag resize-point bottom-right"></div>
  `,
  styles: [
    `
      :host {
        --size: 20px;
        --position: calc(var(--size) / 2 * -1);
      }

      .resize-point {
        position: absolute;
        aspect-ratio: 1;
        inline-size: var(--size);
        background: #fff;
        border: 1px solid #000;
        cursor: nwse-resize;
        border-radius: 50%;
        user-select: none;
      }

      .top-left {
        top: var(--position);
        left: var(--position);
        cursor: nwse-resize;
      }

      .top-right {
        top: var(--position);
        right: var(--position);
        cursor: nesw-resize;
      }

      .bottom-left {
        bottom: var(--position);
        left: var(--position);
        cursor: nesw-resize;
      }

      .bottom-right {
        bottom: var(--position);
        right: var(--position);
        cursor: nwse-resize;
      }
    `,
  ],
})
export class ResizeHandlerComponent implements Resizable {
  private moveService = inject(MoveService);
  private destroyRef = inject(DestroyRef);
  private resizeService = inject(ResizeService);

  @Input({ required: true })
  public node!: TuNode<Resizable>;

  @Input()
  public scale = 1;

  public get nodeType() {
    return this.node.type;
  }

  public get width() {
    return this.node.content.width;
  }

  public get height() {
    return this.node.content.height;
  }

  public get position() {
    return this.node.content.position;
  }

  public get rotation() {
    return this.node.content.rotation;
  }

  public get id() {
    return this.node.id;
  }

  @ViewChild('topLeft') public set topLeft(el: ElementRef<HTMLElement>) {
    this.listen(el.nativeElement, 'top-left');
  }

  @ViewChild('topRight') public set topRight(el: ElementRef<HTMLElement>) {
    this.listen(el.nativeElement, 'top-right');
  }

  @ViewChild('bottomLeft') public set bottomLeft(el: ElementRef<HTMLElement>) {
    this.listen(el.nativeElement, 'bottom-left');
  }

  @ViewChild('bottomRight') public set bottomRight(
    el: ElementRef<HTMLElement>,
  ) {
    this.listen(el.nativeElement, 'bottom-right');
  }

  public listen(handler: HTMLElement, position: ResizePosition) {
    const onStart = () => {
      this.resizeService.startEvent.next({
        type: this.nodeType,
        id: this.id,
        content: {
          width: this.width,
          height: this.height,
        },
      });
    };

    this.moveService
      .listenIncrementalAreaSelector(handler, this, position, onStart)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((size) => {
        this.resizeService.resizeEvent.next({
          type: this.nodeType,
          id: this.id,
          content: {
            position: {
              x: size.x,
              y: size.y,
            },
            width: size.width,
            height: size.height,
          },
        });
      });
  }
}
