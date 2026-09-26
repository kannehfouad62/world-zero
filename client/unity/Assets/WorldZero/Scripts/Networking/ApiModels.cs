using System;

namespace WorldZero.Networking
{
    [Serializable]
    public sealed class WorldStatusResponse
    {
        public string worldId;
        public string worldName;
        public string city;
        public string status;
        public string serverTime;
        public string worldTime;
        public long worldTick;
    }
}

namespace WorldZero.Networking
{
    [Serializable]
    public sealed class LoginRequest
    {
        public string email;
        public string password;
    }

    [Serializable]
    public sealed class AuthPlayerSummary
    {
        public string id;
        public string username;
        public string displayName;
    }

    [Serializable]
    public sealed class AuthResponse
    {
        public string accessToken;
        public string refreshToken;
        public int accessTokenExpiresInSeconds;
        public AuthPlayerSummary player;
    }

    [Serializable]
    public sealed class PlayerPositionResponse
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class PlayerPresenceResponse
    {
        public string districtId;
        public string districtName;
        public PlayerPositionResponse position;
        public float rotationY;
        public int version;
        public string enteredAt;
        public string updatedAt;
    }

    [Serializable]
    public sealed class PlayerResponse
    {
        public string id;
        public string username;
        public string displayName;
        public string status;
        public string createdAt;
        public string lastSeenAt;
        public PlayerPresenceResponse presence;
    }
}

namespace WorldZero.Networking
{
    [Serializable]
    public sealed class UpdatePlayerPositionRequest
    {
        public PlayerPositionResponse position;
        public float rotationY;
        public int expectedVersion;
    }
}
