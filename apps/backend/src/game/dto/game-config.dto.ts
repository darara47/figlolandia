import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateIf,
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
    description: 'Częstotliwość zdarzeń (0-1)',
    example: 0.3,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  eventFrequency?: number;

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
}

