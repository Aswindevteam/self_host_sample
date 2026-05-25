import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('users')
  getUsers(): any[] {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ];
  }

  @Get('products')
  getProducts(): any[] {
    return [
      { id: 101, name: 'Laptop' },
      { id: 102, name: 'Smartphone' },
      { id: 103, name: 'Tablet' }
    ];
  }
}
