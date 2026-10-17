using System;

namespace WorldZero.Networking
{
    // =========================================================
    // WORLD STATUS
    // =========================================================

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

    // =========================================================
    // AUTHENTICATION
    // =========================================================

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

    // =========================================================
    // PLAYER IDENTITY AND WORLD PRESENCE
    // =========================================================

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

    [Serializable]
    public sealed class UpdatePlayerPositionRequest
    {
        public PlayerPositionResponse position;
        public float rotationY;
        public int expectedVersion;
    }

    // =========================================================
    // NPC IDENTITY AND LOCATION
    // =========================================================

    [Serializable]
    public sealed class NpcLocationResponse
    {
        public string id;
        public string name;
        public string slug;
    }

    [Serializable]
    public sealed class NpcPositionResponse
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class NpcResponse
    {
        public string id;
        public string slug;
        public string firstName;
        public string lastName;
        public string occupation;
        public string status;
        public string districtId;
        public NpcLocationResponse currentLocation;
        public NpcPositionResponse position;
        public string personality;
        public int energy;
        public int stress;
    }

    [Serializable]
    public sealed class NpcListResponse
    {
        public NpcResponse[] items;
    }

    // =========================================================
    // NPC RELATIONSHIPS AND MEMORIES
    // =========================================================

    [Serializable]
    public sealed class NpcRelationshipResponse
    {
        public string npcId;
        public string playerId;
        public int trust;
        public int familiarity;
        public int respect;
        public int resentment;
        public string lastInteractionAt;
    }

    [Serializable]
    public sealed class NpcMemoryResponse
    {
        public string id;
        public string type;
        public string summary;
        public int importance;
        public string occurredAt;
    }

    // =========================================================
    // MAYA INTERACTION
    // =========================================================

    [Serializable]
    public sealed class MayaHelpDecisionRequest
    {
        public string decision;
    }

    [Serializable]
    public sealed class MayaInteractionNpcResponse
    {
        public string id;
        public string name;
    }

    [Serializable]
    public sealed class MayaInteractionResponse
    {
        public MayaInteractionNpcResponse npc;
        public string decision;
        public string message;
        public NpcRelationshipResponse relationship;
        public NpcMemoryResponse memory;
    }

    // =========================================================
    // PERSISTENT EVENT DECISION STATUS
    // =========================================================

    [Serializable]
    public sealed class MayaDecisionStatusResponse
    {
        public string eventId;
        public string eventSlug;
        public string eventStatus;
        public bool hasDecided;
        public string decision;
        public string decidedAt;
    }
}

namespace WorldZero.Networking
{
    [System.Serializable]
    public sealed class PlayerObjectiveResponse
    {
        public string id;
        public string eventId;
        public string eventSlug;
        public string title;
        public string description;
        public string status;
        public int currentStep;
        public int totalSteps;
        public string currentObjective;
        public string districtId;
        public string startedAt;
        public string completedAt;
    }

    [System.Serializable]
    public sealed class PlayerObjectivesResponse
    {
        public PlayerObjectiveResponse[] objectives;
    }
}
