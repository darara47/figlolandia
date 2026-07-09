import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GameConfigDto {
  @ApiProperty({
    description: 'Maksymalna liczba rund',
    example: 10,
    minimum: 1,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  maxRounds?: number;

  @ApiProperty({
    description: 'Próg zwycięstwa (suma złota + wartość budynków)',
    example: 50,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  victoryThreshold?: number;

  @ApiProperty({
    description: 'Częstotliwość zdarzeń (0-100%)',
    example: 0,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  eventFrequency?: number;

  @ApiProperty({
    description: 'Bonus złota dla gracza rozstrzygniętego jako ostatni w rundzie',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  lastMoveGoldBonus?: number;

  @ApiProperty({
    description: 'Minimalna liczba graczy',
    example: 3,
    minimum: 3,
    maximum: 8,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(8)
  @Type(() => Number)
  minPlayers?: number;

  @ApiProperty({
    description: 'Maksymalna liczba graczy',
    example: 8,
    minimum: 3,
    maximum: 8,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(8)
  @Type(() => Number)
  maxPlayers?: number;

  @ApiProperty({
    description: 'Tempo animacji rozstrzygnięcia rundy',
    example: 'full',
    enum: ['full', 'fast', 'off'],
    required: false,
  })
  @IsOptional()
  @IsIn(['full', 'fast', 'off'])
  animationSpeed?: 'full' | 'fast' | 'off';
}

