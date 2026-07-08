import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

/**
 * Guard do autoryzacji WebSocket połączeń
 * W MVP: podstawowa walidacja, w produkcji: JWT/authentication
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    // W MVP: akceptujemy wszystkie połączenia
    // W produkcji: sprawdź token, sesję, itp.
    return true;
  }
}

