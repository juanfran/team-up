import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NodeToolbar } from './node-toolbar.model';
import { TuNode } from '@tapiz/board-commons';
import { input } from '@angular/core';
import { OptionFormatComponent } from './options/format/option-format.component';
import { OptionFontComponent } from './options/font/option-font.component';
import { OptionSizeComponent } from './options/size/option-size.component';
import { OptionAlignComponent } from './options/align/option-align.component';
import { OptionListComponent } from './options/list/option-list.component';
import { ToolbarEditorService } from './toolbar-editor.service';
import { OptionLayoutComponent } from './options/layout/option-layout.component';

@Component({
  selector: 'tapiz-toolbar',
  template: `
    <tapiz-toolbar-option-format [editor]="editor()" />
    <tapiz-toolbar-option-font [editor]="editor()" />
    <tapiz-toolbar-option-size [editor]="editor()" />
    <tapiz-toolbar-option-align [editor]="editor()" />
    <tapiz-toolbar-option-list [editor]="editor()" />

    @if (layoutOptions()) {
      <tapiz-toolbar-option-layout [node]="node()" />
    }
  `,
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    OptionFormatComponent,
    OptionFontComponent,
    OptionSizeComponent,
    OptionAlignComponent,
    OptionListComponent,
    OptionLayoutComponent,
  ],
  providers: [ToolbarEditorService],
})
export class ToolbarComponent {
  #cd = inject(ChangeDetectorRef);

  #destroyRef = inject(DestroyRef);
  #toolbarEditorService = inject(ToolbarEditorService);

  editor = input.required<Editor>();
  node = input.required<TuNode<NodeToolbar>>();

  x = input(0);
  y = input(0);

  layoutOptions = input(false);

  closeMenus = input<Observable<unknown>>();

  constructor() {
    afterNextRender(() => {
      this.editor().on('transaction', () => {
        this.#cd.detectChanges();
      });

      this.closeMenus()
        ?.pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => {
          if (document.activeElement) {
            (document.activeElement as HTMLElement).blur();
          }
          document.body.focus();
        });

      this.#toolbarEditorService.listenToEditor(this.editor);
    });
  }
}
