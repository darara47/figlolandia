import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplicationContext } from '@nestjs/common';

export class SocketIOAdapter extends IoAdapter {
  constructor(app?: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const serverOptions: ServerOptions = {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['*'],
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      path: '/socket.io',
      connectTimeout: 45000,
    };

    const server = super.createIOServer(port, serverOptions);
    return server;
  }
}

