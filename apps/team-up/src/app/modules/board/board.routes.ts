import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { BoardComponent } from './board/board.component';
import { pageFeature } from './reducers/page.reducer';
import { BoardEffects } from './effects/board.effects';
import { HistoryEffects } from './effects/history.effects';
import { PageEffects } from './effects/page.effects';

export const boardRoutes: Route[] = [
  {
    path: '',
    component: BoardComponent,
    providers: [
      provideState(pageFeature),
      provideEffects(BoardEffects, HistoryEffects, PageEffects),
    ],
  },
];
