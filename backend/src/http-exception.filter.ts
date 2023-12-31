import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}
  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';

    if (exception instanceof PrismaClientKnownRequestError) {
      // Handle Prisma errors
      status = determineStatusCode(exception.code);
      message = exception.message.replace(/\n/g, '') || 'Prisma Error';
    } else if (exception.status) {
      // Handle HTTP-related errors
      status = exception.status;
      message =
        exception.response.message || exception.message || 'Unknown Error';
    }

    this.logger.error({
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      message,
      exception: exception.stack,
    });

    response.status(status).json({
      success: false,
      message,
      status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }
}

const determineStatusCode = (code: string): number => {
  switch (code) {
    case 'P2002':
      return 409;
    case 'P2025':
      return HttpStatus.NOT_FOUND;
    default:
      return 500;
  }
};
