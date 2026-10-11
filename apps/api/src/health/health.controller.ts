<<<<<<< HEAD
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

=======
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
  @Get()
  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'api' };
  }
<<<<<<< HEAD

  @Get('live')
  getLiveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable', database: 'unavailable' });
    }
  }
=======
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
}
