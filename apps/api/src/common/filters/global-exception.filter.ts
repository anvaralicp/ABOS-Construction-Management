import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let type = 'UnexpectedError';
    let details = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      message = exceptionResponse.message || exception.message;
      type = exceptionResponse.error || 'HttpException';
      
      // Class-validator returns an array of messages
      if (Array.isArray(message)) {
        type = 'ValidationError';
        details = message;
        message = 'Validation failed';
      }
    } else if (exception.code && exception.code.startsWith('P')) {
      // Prisma Client Errors (masked for security)
      status = HttpStatus.BAD_REQUEST;
      type = 'DatabaseError';
      
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A conflict occurred with unique constraints.';
        type = 'ConflictError';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'The requested database record was not found.';
        type = 'NotFoundError';
      } else {
        message = 'A database error occurred.';
      }
    } else {
      // Log unexpected errors securely without leaking them to the client
      this.logger.error(`${request.method} ${request.url} - ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}