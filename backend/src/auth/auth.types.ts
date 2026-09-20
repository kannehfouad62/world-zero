export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  playerId: string;
  sessionId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  player: {
    id: string;
    username: string;
    displayName: string;
  };
}
