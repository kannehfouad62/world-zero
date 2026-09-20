import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { accounts, authSessions, players } from '../database/schema.js';
import type {
  AccessTokenPayload,
  AuthResponse,
  LoginInput,
} from './auth.types.js';
import { generateRefreshToken, hashRefreshToken } from './auth.utils.js';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresInSeconds = 15 * 60;

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async createAccountForPlayer(
    playerId: string,
    emailInput: string,
    password: string,
  ): Promise<void> {
    const email = emailInput.trim().toLowerCase();

    if (!this.isValidEmail(email)) {
      throw new ConflictException('A valid email address is required');
    }

    if (password.length < 10 || password.length > 128) {
      throw new ConflictException(
        'Password must be between 10 and 128 characters',
      );
    }

    const [existing] = await this.database.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1);

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    await this.database.db.insert(accounts).values({
      playerId,
      email,
      passwordHash,
    });
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();

    const [result] = await this.database.db
      .select({
        accountId: accounts.id,
        accountStatus: accounts.status,
        passwordHash: accounts.passwordHash,
        playerId: players.id,
        username: players.username,
        displayName: players.displayName,
        playerStatus: players.status,
      })
      .from(accounts)
      .innerJoin(players, eq(players.id, accounts.playerId))
      .where(eq(accounts.email, email))
      .limit(1);

    if (!result) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(
      result.passwordHash,
      input.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (result.accountStatus !== 'ACTIVE' || result.playerStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const refreshDays = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);

    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    const [session] = await this.database.db
      .insert(authSessions)
      .values({
        accountId: result.accountId,
        refreshTokenHash,
        expiresAt,
      })
      .returning({
        id: authSessions.id,
      });

    await this.database.db
      .update(accounts)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, result.accountId));

    const payload: AccessTokenPayload = {
      sub: result.accountId,
      playerId: result.playerId,
      sessionId: session.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: this.accessTokenExpiresInSeconds,
      player: {
        id: result.playerId,
        username: result.username,
        displayName: result.displayName,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    const [result] = await this.database.db
      .select({
        sessionId: authSessions.id,
        accountId: accounts.id,
        playerId: players.id,
        username: players.username,
        displayName: players.displayName,
        accountStatus: accounts.status,
        playerStatus: players.status,
      })
      .from(authSessions)
      .innerJoin(accounts, eq(accounts.id, authSessions.accountId))
      .innerJoin(players, eq(players.id, accounts.playerId))
      .where(
        and(
          eq(authSessions.refreshTokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (
      !result ||
      result.accountStatus !== 'ACTIVE' ||
      result.playerStatus !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    await this.database.db
      .update(authSessions)
      .set({
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: now,
      })
      .where(eq(authSessions.id, result.sessionId));

    const payload: AccessTokenPayload = {
      sub: result.accountId,
      playerId: result.playerId,
      sessionId: result.sessionId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken: newRefreshToken,
      accessTokenExpiresInSeconds: this.accessTokenExpiresInSeconds,
      player: {
        id: result.playerId,
        username: result.username,
        displayName: result.displayName,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);

    await this.database.db
      .update(authSessions)
      .set({
        revokedAt: new Date(),
      })
      .where(eq(authSessions.refreshTokenHash, tokenHash));
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
