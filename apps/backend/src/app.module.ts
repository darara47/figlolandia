import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { DefaultGateway } from './websocket/default.gateway';

const frontendDistPath = join(__dirname, '..', '..', 'frontend', 'dist');
const serveWeb =
  process.env.SERVE_WEB !== 'false' && existsSync(frontendDistPath);

@Module({
  imports: [
    ...(serveWeb
      ? [
        ServeStaticModule.forRoot({
          rootPath: frontendDistPath,
          exclude: ['/api*', '/games*', '/debug*', '/health', '/status', '/socket.io*'],
          serveStaticOptions: {
            index: 'index.html',
          },
          renderPath: '*',
        }),
      ]
      : []),
    GameModule,
  ],
  controllers: [AppController],
  providers: [AppService, DefaultGateway],
})
export class AppModule { }
