using UnityEngine;

namespace WorldZero.NPC
{
    public sealed class NpcVisual : MonoBehaviour
    {
        public string NpcId { get; private set; }
        public string NpcSlug { get; private set; }
        public string DisplayName { get; private set; }
        public string Occupation { get; private set; }

        public void Initialize(
            string npcId,
            string npcSlug,
            string displayName,
            string occupation
        )
        {
            NpcId = npcId;
            NpcSlug = npcSlug;
            DisplayName = displayName;
            Occupation = occupation;

            gameObject.name = $"NPC — {displayName}";
        }
    }
}
