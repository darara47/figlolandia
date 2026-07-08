import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * Domyślny WebSocket Gateway dla głównego namespace Socket.IO
 * Wymagany, aby Socket.IO mógł połączyć się z głównym namespace przed przejściem do /game
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DefaultGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DefaultGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Klient połączony z głównym namespace: ${client.id}`);
    // Klient automatycznie przejdzie do namespace /game
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Klient rozłączony z głównego namespace: ${client.id}`);
  }
}

