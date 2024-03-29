import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  ViewChild,
  inject,
} from '@angular/core';

import { MoveService } from '@team-up/cdk/services/move.service';
import { Rotatable, TuNode } from '@team-up/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filterNil } from 'ngxtension/filter-nil';
import { RotateService } from './rotate.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'team-up-rotate-handler',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div
      #handler
      class="no-drag rotate">
      <mat-icon class="mat-icon">refresh</mat-icon>
    </div>
  `,
  styles: [
    `
      .rotate {
        cursor: pointer;
      }
    `,
  ],
})
export class RotateHandlerComponent {
  private moveService = inject(MoveService);
  private destroyRef = inject(DestroyRef);
  private rotateService = inject(RotateService);
  private el = inject(ElementRef);

  @Input({ required: true })
  public node!: TuNode<Rotatable>;

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

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public get id() {
    return this.node.id;
  }

  @ViewChild('handler') public set handler(el: ElementRef<HTMLElement>) {
    this.listen(el.nativeElement);
  }

  public listen(handler: HTMLElement) {
    const onStart = () => {
      this.rotateService.startEvent.next({
        type: this.nodeType,
        id: this.id,
        content: {
          rotation: this.rotation,
          position: {
            x: this.position.x,
            y: this.position.y,
          },
        },
      });
    };

    this.moveService
      .listenRotation(handler, this, onStart)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((path) => {
        this.rotateService.resizeEvent.next({
          type: this.nodeType,
          id: this.id,
          content: {
            rotation: path.rotation,
            position: {
              x: path.x,
              y: path.y,
            },
          },
        });
      });
  }
}
