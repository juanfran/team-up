import { BoardFacade } from '@/app/services/board-facade.service';
import { CopyPasteService } from '@/app/services/copy-paste.service';
import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { NodesStore } from '@team-up/nodes/services/nodes.store';
import {
  ContextMenuItem,
  ContextMenuStore,
} from '@team-up/ui/context-menu/context-menu.store';
import { combineLatest, take } from 'rxjs';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardComponent } from '../../board/board.component';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';

@Component({
  selector: 'team-up-board-context-menu',
  template: '',
  styles: `:host {
    display: none;
  }`,
  standalone: true,
})
export class BoardContextMenuComponent implements OnInit {
  private contextMenuStore = inject(ContextMenuStore);
  private copyPasteService = inject(CopyPasteService);
  private nodesStore = inject(NodesStore);
  private boardFacade = inject(BoardFacade);
  private store = inject(Store);
  private boardComponent = inject(BoardComponent);

  public readonly boardMode = this.store.selectSignal(
    pageFeature.selectCanvasMode,
  );

  ngOnInit() {
    this.contextMenuStore.config({
      element: this.boardComponent.el.nativeElement,
      items: () => {
        const currentNodes = this.boardFacade.selectFocusNodes();

        if (currentNodes?.length) {
          const actions: ContextMenuItem[] = [
            {
              label: 'Copy',
              icon: 'content_copy',
              help: 'Ctrl + C',
              action: () => {
                this.nodesStore.actions.copyNodes({ nodes: currentNodes });
              },
            },
            {
              label: 'Delete',
              icon: 'delete',
              help: 'Supr',
              action: () => {
                this.nodesStore.actions.deleteNodes({
                  nodes: currentNodes.map((it) => {
                    return {
                      id: it.id,
                      type: it.type,
                    };
                  }),
                });
              },
            },
          ];

          if (this.boardMode() === 'editMode') {
            actions.unshift({
              label: 'Move to compose',
              icon: 'flip_to_back',
              action: () => {
                this.store.dispatch(
                  BoardActions.batchNodeActions({
                    history: true,
                    actions: currentNodes.map((node) => {
                      return {
                        data: {
                          type: node.type,
                          id: node.id,
                          content: {
                            layer: 1,
                          },
                        },
                        op: 'patch',
                      };
                    }),
                  }),
                );

                this.store.dispatch(
                  PageActions.setFocusId({
                    focusId: '',
                  }),
                );
              },
            });
          } else {
            actions.unshift({
              label: 'Move to edit',
              icon: 'flip_to_front',
              action: () => {
                this.store.dispatch(
                  BoardActions.batchNodeActions({
                    history: true,
                    actions: currentNodes.map((node) => {
                      return {
                        data: {
                          type: node.type,
                          id: node.id,
                          content: {
                            layer: 0,
                          },
                        },
                        op: 'patch',
                      };
                    }),
                  }),
                );

                this.store.dispatch(
                  PageActions.setFocusId({
                    focusId: '',
                  }),
                );
              },
            });
          }

          return actions;
        }

        return [
          {
            label: 'Paste',
            icon: 'content_paste',
            help: 'Ctrl + V',
            action: (event: MouseEvent) => {
              combineLatest([
                this.store.select(pageFeature.selectPosition),
                this.store.select(pageFeature.selectZoom),
              ])
                .pipe(take(1))
                .subscribe(([position, zoom]) => {
                  this.copyPasteService.pasteCurrentClipboard({
                    x: (-position.x + event.x) / zoom,
                    y: (-position.y + event.y) / zoom,
                  });
                });
            },
          },
        ];
      },
    });
  }
}
