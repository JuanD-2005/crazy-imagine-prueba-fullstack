import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @Length(3, 200)
  title!: string;

  @IsString()
  @Length(10, 2000)
  description!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  assignedTo?: number | null;
}
