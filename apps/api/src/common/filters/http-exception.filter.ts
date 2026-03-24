import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      exception instanceof HttpException
        ? typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any)?.message ?? 'Internal server error'
        : 'Internal server error';

    const errors =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as any).message)
        ? (exceptionResponse as any).message
        : undefined;

    response.status(status).json({
      statusCode: status,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
      traceId: (request as any)['traceId'],
    });
  }
}
