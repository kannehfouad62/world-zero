using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class NpcApiClient : MonoBehaviour
    {
        public IEnumerator GetDistrictNpcs(
            string districtSlug,
            Action<NpcResponse[]> onSuccess,
            Action<string> onFailure
        )
        {
            string url =
                $"{ApiConfig.BaseUrl}/npcs/district/{districtSlug}";

            using UnityWebRequest request =
                UnityWebRequest.Get(url);

            request.timeout = 15;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"NPC load failed: {request.responseCode} " +
                    $"{request.downloadHandler.text}"
                );

                yield break;
            }

            string wrappedJson =
                "{\"items\":" +
                request.downloadHandler.text +
                "}";

            NpcListResponse response =
                JsonUtility.FromJson<NpcListResponse>(
                    wrappedJson
                );

            if (response?.items == null)
            {
                onFailure?.Invoke(
                    "NPC response could not be parsed."
                );

                yield break;
            }

            onSuccess?.Invoke(response.items);
        }
    }
}
