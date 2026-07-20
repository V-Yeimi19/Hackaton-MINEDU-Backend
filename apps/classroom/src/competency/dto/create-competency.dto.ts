import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCompetencyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  area: string;
}
