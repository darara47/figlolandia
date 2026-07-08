import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { SocketIOAdapter } from './websocket/socket-io.adapter';
import * as os from 'os';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Włącz globalny exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Włącz globalną walidację DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Usuń nieznane właściwości
      forbidNonWhitelisted: true, // Rzuć błąd jeśli są nieznane właściwości
      transform: true, // Automatyczna transformacja typów
      transformOptions: {
        enableImplicitConversion: true, // Włącz automatyczną konwersję typów
      },
    }),
  );

  // Włącz CORS dla WebSocket
  app.enableCors({
    origin: '*', // W MVP: pozwól wszystkim, w produkcji: ogranicz
    credentials: true,
  });

  // Użyj niestandardowego Socket.IO adaptera z konfiguracją CORS
  app.useWebSocketAdapter(new SocketIOAdapter(app));

  // Konfiguracja Swagger
  const config = new DocumentBuilder()
    .setTitle('Figlolandia API')
    .setDescription('API dokumentacja dla backendu gry Figlolandia')
    .setVersion('1.0')
    .addTag('games', 'Zarządzanie grami')
    .addTag('health', 'Health check')
    .build();
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('api', app as any, document);

  const port = process.env.PORT || 3008;
  const host = process.env.HOST || '0.0.0.0'; // Nasłuchuj na wszystkich interfejsach sieciowych
  await app.listen(port, host);

  // Pobierz lokalne IP dla wyświetlenia w logach
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const addr of addresses || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIp = addr.address;
        break;
      }
    }
    if (localIp !== 'localhost') break;
  }

  logger.log(`🚀 Backend Figlolandia uruchomiony na porcie ${port}`);
  logger.log(`📡 WebSocket Gateway dostępny na ws://${localIp}:${port}/game`);
  logger.log(`📚 Swagger dokumentacja dostępna na http://${localIp}:${port}/api`);
  logger.log(`🌐 Aplikacja dostępna z innych urządzeń w sieci: http://${localIp}:${port}`);
}

bootstrap();
