import { inject } from '@angular/core';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ConfigService } from '@/app/services/config.service';

import { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const configService = inject(ConfigService);
  const router = inject(Router);

  if (
    configService.config &&
    (req.url.includes(configService.config.API) ||
      req.url.includes(configService.config.WS))
  ) {
    const request = req.clone({
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
      withCredentials: true,
    });

    return next(request).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          void router.navigate(['/login']);
        }

        return throwError(() => err);
      }),
    );
  }

  return next(req);
};
