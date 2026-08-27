import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAllPublic();
  }
}
