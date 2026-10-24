using System;

namespace WorldZero.Networking
{
    [Serializable]
    public sealed class MayaDeliveryStatusResponse
    {
        public string eventSlug;
        public string status;
        public int currentStep;
        public bool hasRecoveredSupplies;
        public bool canDeliver;
        public bool completed;
        public string completedAt;
    }

    [Serializable]
    public sealed class MayaDeliveryRelationshipResponse
    {
        public int trust;
        public int familiarity;
        public int respect;
        public int resentment;
    }

    [Serializable]
    public sealed class MayaDeliveryMemoryResponse
    {
        public string id;
        public string type;
        public string summary;
        public int importance;
    }

    [Serializable]
    public sealed class MayaDeliveryResponse
    {
        public string eventId;
        public string eventSlug;
        public string status;
        public int previousStep;
        public int currentStep;
        public string completedAt;
        public string message;
        public MayaDeliveryRelationshipResponse relationship;
        public MayaDeliveryMemoryResponse memory;
    }
}
