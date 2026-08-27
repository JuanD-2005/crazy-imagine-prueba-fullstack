import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../generated/prisma/enums.js';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  assignedTo?: number | null;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority | null;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
