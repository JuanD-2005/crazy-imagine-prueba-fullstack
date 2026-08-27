import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
} from '../../generated/prisma/enums.js';

export const EnrichmentCallbackStatus = {
  done: 'done',
  failed: 'failed',
} as const;
export type EnrichmentCallbackStatus =
  (typeof EnrichmentCallbackStatus)[keyof typeof EnrichmentCallbackStatus];

export class EnrichmentCallbackDto {
  @IsInt()
  @IsPositive()
  ticketId!: number;

  @IsEnum(EnrichmentCallbackStatus)
  status!: EnrichmentCallbackStatus;

  @ValidateIf(
    (dto: EnrichmentCallbackDto) =>
      dto.status === EnrichmentCallbackStatus.done,
  )
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ValidateIf(
    (dto: EnrichmentCallbackDto) =>
      dto.status === EnrichmentCallbackStatus.done,
  )
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  suggestedReply?: string;

  /** Detalle opcional del motivo de fallo, informativo — no se persiste. */
  @IsOptional()
  @IsString()
  reason?: string;
}
