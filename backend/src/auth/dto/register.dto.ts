import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Opcional a nivel de DTO a propósito: si fuera obligatorio con
  // class-validator, un registro sin inviteCode devolvería 400 (ValidationPipe)
  // antes de llegar al service. Queremos que "sin código" y "código incorrecto"
  // den el mismo 403 — el service es la única autoridad que decide eso.
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
