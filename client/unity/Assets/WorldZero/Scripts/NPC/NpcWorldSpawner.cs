using System.Collections;
using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.NPC
{
    public sealed class NpcWorldSpawner : MonoBehaviour
    {
        [SerializeField]
        private NpcApiClient npcApiClient;

        private readonly Color npcColor =
            new Color(0.92f, 0.62f, 0.25f);

        private IEnumerator Start()
        {
            if (npcApiClient == null)
            {
                Debug.LogError(
                    "NpcWorldSpawner requires NpcApiClient."
                );

                yield break;
            }

            NpcResponse[] npcs = null;
            string failure = null;

            yield return npcApiClient.GetDistrictNpcs(
                "district-01",
                response => npcs = response,
                error => failure = error
            );

            if (!string.IsNullOrWhiteSpace(failure))
            {
                Debug.LogError(failure);
                yield break;
            }

            if (npcs == null)
            {
                yield break;
            }

            foreach (NpcResponse npc in npcs)
            {
                SpawnNpc(npc);
            }

            Debug.Log(
                $"Loaded {npcs.Length} NPC(s) into District 01."
            );
        }

        private void SpawnNpc(NpcResponse npc)
        {
            GameObject npcObject =
                GameObject.CreatePrimitive(
                    PrimitiveType.Capsule
                );

            npcObject.transform.position = new Vector3(
                npc.position.x,
                npc.position.y + 1f,
                npc.position.z
            );

            Renderer renderer =
                npcObject.GetComponent<Renderer>();

            Material material = new Material(
                Shader.Find(
                    "Universal Render Pipeline/Lit"
                )
            );

            material.color = npcColor;
            renderer.material = material;

            NpcVisual visual =
                npcObject.AddComponent<NpcVisual>();

            visual.Initialize(
                npc.id,
                npc.slug,
                npc.firstName,
                npc.occupation
            );

            CreateNameLabel(
                npcObject.transform,
                npc.firstName,
                npc.occupation
            );

            Debug.Log(
                $"Spawned NPC {npc.firstName} | " +
                $"{npc.occupation} | " +
                $"({npc.position.x}, " +
                $"{npc.position.y}, " +
                $"{npc.position.z})"
            );
        }

        private static void CreateNameLabel(
            Transform parent,
            string displayName,
            string occupation
        )
        {
            GameObject label =
                new GameObject("NPC Label");

            label.transform.SetParent(parent);
            label.transform.localPosition =
                new Vector3(0f, 1.5f, 0f);

            TextMesh text =
                label.AddComponent<TextMesh>();

            text.text =
                $"{displayName}\n{occupation}";

            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.12f;
            text.fontSize = 36;
        }
    }
}
