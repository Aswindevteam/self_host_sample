import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class ApiTrackingInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    
    const endpoint = request.route?.path || request.path;
    const method = request.method;
    
    // We only track standard API methods, and ignore OPTIONS or health checks if any
    if (method !== 'OPTIONS' && !endpoint.includes('/metrics')) {
      // The user object is set by the auth guard. If not authenticated, user is undefined.
      const organizationId = request.user?.organizationId;
      
      // We don't await this, run it asynchronously to not block the request
      this.metricsService.trackApiUsage(endpoint, method, organizationId).catch(err => {
        console.error('Failed to track API usage:', err);
      });
    }

    return next.handle();
  }
}
