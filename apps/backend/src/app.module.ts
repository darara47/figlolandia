import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { DefaultGateway } from './websocket/default.gateway';

@Module({
  imports: [GameModule],
  controllers: [AppController],
  providers: [AppService, DefaultGateway],
})
export class AppModule { }
