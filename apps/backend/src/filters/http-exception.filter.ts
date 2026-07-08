import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Socket } from 'socket.io';

/**
 * Globalny exception filter dla aplikacji
 * Obsługuje błędy HTTP i WebSocket
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'ws') {
      this.handleWebSocketException(exception, host);
    } else {
      this.handleHttpException(exception, host);
    }
  }

  /**
   * Obsługa błędów HTTP (REST API)
   */
  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Wystąpił nieoczekiwany błąd';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || 'Błąd serwera',
      ...(typeof message === 'object' && !(message instanceof Error) ? message : {}),
    };

    // Logowanie błędów
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${errorResponse.message}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Obsługa błędów WebSocket
   */
  private handleWebSocketException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Wystąpił nieoczekiwany błąd';

    const errorMessage = typeof message === 'string'
      ? message
      : (message as any).message || 'Błąd serwera';

    // Logowanie błędów WebSocket
    this.logger.error(
      `WebSocket error dla klienta ${client.id}: ${errorMessage}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Emituj błąd do klienta
    client.emit('error', {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

