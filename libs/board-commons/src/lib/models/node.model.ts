import { type Type } from '@angular/core';

export interface TuNode<C = object, T = string> {
  id: string;
  type: T;
  content: C;
  children?: TuNode[];
}

export interface NodeAdd {
  op: 'add';
  data: TuNode;
  parent?: string;
}

export interface NodePatch {
  op: 'patch';
  data: TuNode;
  parent?: string;
}

export interface NodeRemove {
  op: 'remove';
  data: Pick<TuNode, 'id' | 'type'>;
  parent?: string;
}

export type StateActions = NodeAdd | NodePatch | NodeRemove;

export interface BachStateActions {
  actions: StateActions[];
  history?: boolean;
}

interface NodeValidatorError {
  success: false;
}

export interface NodeConfig {
  loadComponent: () => Promise<Type<unknown>>;
  config?: unknown;
}

export interface NodeValidator {
  add: (
    data: TuNode,
    userId: string,
    state: TuNode[],
  ) =>
    | {
        success: true;
        data: TuNode;
      }
    | NodeValidatorError;
  patch: (
    data: TuNode,
    userId: string,
    state: TuNode[],
    node: TuNode,
  ) =>
    | {
        success: true;
        data: TuNode;
      }
    | NodeValidatorError;
  remove: (
    data: NodeRemove['data'],
    userId: string,
    state: TuNode[],
    node: TuNode,
  ) =>
    | {
        success: true;
        data: NodeRemove['data'];
      }
    | NodeValidatorError;
}
