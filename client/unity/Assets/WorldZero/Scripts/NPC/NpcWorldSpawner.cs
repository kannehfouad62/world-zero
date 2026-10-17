using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.NPC
{
    public sealed class NpcWorldSpawner : MonoBehaviour
    {
        [SerializeField]
        private NpcApiClient npcApiClient;

        [SerializeField]
        private string districtSlug = "district-01";

        [SerializeField]
        private float retryIntervalSeconds = 5f;

        private readonly Dictionary<string, GameObject> spawnedNpcs =
            new Dictionary<string, GameObject>();

        private readonly Color npcColor =
            new Color(0.92f, 0.62f, 0.25f);

        private IEnumerator Start()
        {
            Debug.Log("WORLD ZERO NPC Spawner initialized.");

            if (npcApiClient == null)
            {
                npcApiClient = GetComponent<NpcApiClient>();
            }

            if (npcApiClient == null)
            {
                Debug.LogError(
                    "NPC Spawner: NpcApiClient is missing."
                );
                yield break;
            }

            while (true)
            {
                bool loaded = false;

                yield return npcApiClient.GetDistrictNpcs(
                    districtSlug,
                    response =>
                    {
                        if (response == null)
                        {
                            return;
                        }

                        foreach (NpcResponse npc in response)
                        {
                            if (npc == null ||
                                string.IsNullOrEmpty(npc.id) ||
                                npc.position == null)
                            {
                                continue;
                            }

                            if (!spawnedNpcs.ContainsKey(npc.id))
                            {
                                SpawnNpc(npc);
                            }
                        }

                        loaded = true;

                        Debug.Log(
                            $"WORLD ZERO NPCs loaded: {response.Length}"
                        );
                    },
                    error =>
                    {
                        Debug.LogWarning(
                            "NPC Spawner request failed: " + error
                        );
                    }
                );

                if (loaded)
                {
                    yield break;
                }

                yield return new WaitForSecondsRealtime(
                    Mathf.Max(1f, retryIntervalSeconds)
                );
            }
        }

        private void SpawnNpc(NpcResponse npc)
        {
            GameObject npcObject =
                GameObject.CreatePrimitive(PrimitiveType.Capsule);

            npcObject.transform.position = new Vector3(
                npc.position.x,
                npc.position.y + 1f,
                npc.position.z
            );

            Renderer renderer =
                npcObject.GetComponent<Renderer>();

            Shader shader = Shader.Find(
                "Universal Render Pipeline/Lit"
            );

            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            if (shader != null && renderer != null)
            {
                Material material = new Material(shader);
                material.color = npcColor;
                renderer.material = material;
            }

            NpcVisual visual =
                npcObject.AddComponent<NpcVisual>();

            visual.Initialize(
                npc.id,
                npc.slug,
                npc.firstName,
                npc.occupation
            );

            spawnedNpcs.Add(npc.id, npcObject);

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
            GameObject label = new GameObject("NPC Label");

            label.transform.SetParent(parent, false);
            label.transform.localPosition =
                new Vector3(0f, 1.5f, 0f);

            TextMesh text = label.AddComponent<TextMesh>();

            text.text = $"{displayName}\n{occupation}";
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.12f;
            text.fontSize = 36;
        }
    }
}
