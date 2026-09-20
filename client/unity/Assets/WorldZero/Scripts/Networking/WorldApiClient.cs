using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class WorldApiClient : MonoBehaviour
    {
        private IEnumerator Start()
        {
            yield return GetWorldStatus();
        }

        private IEnumerator GetWorldStatus()
        {
            string url = $"{ApiConfig.BaseUrl}/world/status";

            using UnityWebRequest request = UnityWebRequest.Get(url);

            request.timeout = 10;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError(
                    $"WORLD ZERO API connection failed: {request.error}"
                );

                yield break;
            }

            WorldStatusResponse world =
                JsonUtility.FromJson<WorldStatusResponse>(
                    request.downloadHandler.text
                );

            if (world == null)
            {
                Debug.LogError(
                    "WORLD ZERO API returned an invalid world response."
                );

                yield break;
            }

            Debug.Log(
                $"Connected to {world.worldName} | " +
                $"{world.city} | Tick {world.worldTick}"
            );
        }
    }
}
