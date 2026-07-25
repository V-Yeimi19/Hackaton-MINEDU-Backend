import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@minedu/common';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
