import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hash(input.password, 12);

    try {
      const organization = await this.prisma.organization.create({
        data: {
          name: input.organizationName.trim(),
          users: { create: { email, passwordHash } },
        },
        include: { users: true },
      });
      const user = organization.users[0];
      return this.issueToken(user.id, user.email, organization.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.organizationId ||
      !(await compare(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return this.issueToken(user.id, user.email, user.organizationId);
  }

  private async issueToken(id: string, email: string, organizationId: string) {
    const accessToken = await this.jwt.signAsync({ sub: id, organizationId });
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: '1h',
      user: { id, email, organizationId },
    };
  }
}
