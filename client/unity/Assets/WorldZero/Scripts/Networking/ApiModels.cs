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
