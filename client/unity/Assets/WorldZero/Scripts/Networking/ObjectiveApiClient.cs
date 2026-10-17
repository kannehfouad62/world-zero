using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class ObjectiveApiClient : MonoBehaviour
    {
        public IEnumerator GetObjectives(
            Action<PlayerObjectivesResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke("Authentication required.");
                yield break;
            }

            using UnityWebRequest request = UnityWebRequest.Get(
                $"{ApiConfig.BaseUrl}/me/objectives"
            );

            request.timeout = 15;

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Objective request failed: HTTP {request.responseCode} " +
                    request.error
                );
                yield break;
            }

            PlayerObjectivesResponse response;

            try
            {
                response = JsonUtility.FromJson<PlayerObjectivesResponse>(
                    request.downloadHandler.text
                );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(exception.Message);
                yield break;
            }

            if (response == null || response.objectives == null)
            {
                onFailure?.Invoke("Invalid objective response.");
                yield break;
            }

            onSuccess?.Invoke(response);
        }
    }
}
