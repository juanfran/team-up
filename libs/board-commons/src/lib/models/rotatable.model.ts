import { Point } from '../models/point.model';

export interface Rotatable {
  rotation: number;
  position: Point;
  width: number;
  height: number;
}

export interface RotatableHost extends Rotatable {
  nativeElement: HTMLElement;
}
