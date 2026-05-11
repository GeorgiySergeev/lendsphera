import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { env } from "../config/env";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./google.strategy";
import { JwtStrategy } from "./jwt.strategy";
import { TokensService } from "./tokens.service";

const googleStrategyProvider = {
  provide: GoogleStrategy,
  useFactory: (auth: AuthService) => {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
      return new GoogleStrategy(auth);
    }
    return null;
  },
  inject: [AuthService],
};

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService, JwtStrategy, googleStrategyProvider],
  exports: [AuthService, TokensService]
})
export class AuthModule {}
