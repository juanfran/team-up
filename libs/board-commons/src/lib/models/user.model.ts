import { TuNode } from './node.model.js';
import { Point } from './point.model.js';

export interface User {
  id: string;
  name: string;
  visible: boolean;
  connected: boolean;
  cursor: Point | null;
  position?: Point;
  zoom?: number;
}

export type UserNode = TuNode<User>;
