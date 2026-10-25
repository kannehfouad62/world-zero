using System;

namespace WorldZero.Journal
{
    [Serializable]
    public sealed class MissionJournalResponse
    {
        public MissionJournalEntry[] missions;
    }

    [Serializable]
    public sealed class MissionJournalEntry
    {
        public string id;
        public string eventId;
        public string eventSlug;
        public string title;
        public string description;
        public string districtId;
        public string status;
        public int currentStep;
        public int totalSteps;
        public string startedAt;
        public string completedAt;
        public string decision;
        public string decidedAt;
        public MissionEvidence[] evidence;
        public MissionRecoveredItem[] recoveredItems;
        public MissionNpc npc;
        public MissionRelationship relationship;
        public MissionMemory[] memories;
    }

    [Serializable]
    public sealed class MissionEvidence
    {
        public string slug;
        public string title;
        public string discoveredAt;
    }

    [Serializable]
    public sealed class MissionRecoveredItem
    {
        public string slug;
        public string name;
        public string recoveredAt;
    }

    [Serializable]
    public sealed class MissionNpc
    {
        public string id;
        public string name;
    }

    [Serializable]
    public sealed class MissionRelationship
    {
        public int trust;
        public int familiarity;
        public int respect;
        public int resentment;
    }

    [Serializable]
    public sealed class MissionMemory
    {
        public string id;
        public string type;
        public string summary;
        public int importance;
        public string occurredAt;
    }
}
