import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { PagesModule } from './pages/pages.module';
import { HttpClientModule } from '@angular/common/http';
import { ApiRestInterceptorModule } from './commons/api-rest-interceptor/api-rest-interceptor.module';
import { WsModule } from './modules/ws/ws.module';
import { BoardModule } from './modules/board/board.module';
import { CommonsModule } from './commons/commons.module';
import { TranslocoRootModule } from './transloco/transloco-root.module';
import { ConfigService, configFactory } from './services/config.service';

document.oncontextmenu = () => {
  return false;
};

export function prefersReducedMotion(): boolean {
  const mediaQueryList = window.matchMedia('(prefers-reduced-motion)');

  return mediaQueryList.matches;
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BoardModule,
    WsModule,
    CommonsModule,
    HttpClientModule,
    ApiRestInterceptorModule,
    PagesModule,
    BrowserModule,
    BrowserAnimationsModule.withConfig({
      disableAnimations: prefersReducedMotion(),
    }),
    StoreRouterConnectingModule.forRoot(),
    StoreModule.forRoot(
      {},
      {
        metaReducers: !environment.production ? [] : [],
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: true,
          strictActionSerializability: true,
          strictActionTypeUniqueness: true,
        },
      }
    ),
    EffectsModule.forRoot([]),
    !environment.production ? StoreDevtoolsModule.instrument() : [],
    TranslocoRootModule,
  ],
  bootstrap: [AppComponent],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: configFactory,
      multi: true,
      deps: [ConfigService],
    },
  ],
})
export class AppModule {}
