import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { ResizableDirective } from './resize.directive';

@Directive({
  selector: '[tuResizeHandler]',
  standalone: true,
})
export class ResizeHandlerDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLElement>);
  private resize = inject(ResizableDirective);

  private get nativeElement() {
    return this.el.nativeElement;
  }

  public ngAfterViewInit() {
    this.resize.setHandler(this.nativeElement);
  }
}