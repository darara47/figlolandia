import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GameConfigDto } from './game-config.dto';

export class StartGameDto {
  @ApiProperty({
    description: 'Konfiguracja gry',
    type: GameConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameConfigDto)
  config?: GameConfigDto;
}

