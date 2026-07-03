import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const isDev = process.env.NODE_ENV !== 'production';
    const request = context.switchToHttp().getRequest<{ method?: string; url?: string }>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: 200,
        data: data as T,
        timestamp: new Date().toISOString(),
      }) as ApiResponse<T>),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((payload) => {
        if (isDev) {
          this.logger.debug(
            `[${request.method ?? 'GET'} ${request.url ?? ''}] status=200 response=${JSON.stringify(payload)}`,
          );
        }
        return payload;
      }),
    );
  }
}
