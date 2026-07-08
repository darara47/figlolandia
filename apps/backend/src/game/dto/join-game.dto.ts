import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class JoinGameDto {
  @ApiProperty({
    description: 'Nazwa gracza',
    example: 'Anna',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  playerName: string;

  @ApiProperty({
    description: '6-cyfrowy PIN gry (alternatywa dla gameId)',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  gamePin?: string;
}

