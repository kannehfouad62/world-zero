using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class PlayerApiClient : MonoBehaviour
    {
        public IEnumerator GetCurrentPlayer(
            Action<PlayerResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke(
                    "Cannot load player without an authenticated session."
                );

                yield break;
            }

            using UnityWebRequest request = UnityWebRequest.Get(
                $"{ApiConfig.BaseUrl}/me"
            );

            ApplyAuthorization(request, session);

            request.timeout = 15;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Player load failed: {request.responseCode} " +
                    $"{request.downloadHandler.text}"
                );

                yield break;
            }

            PlayerResponse player =
                JsonUtility.FromJson<PlayerResponse>(
                    request.downloadHandler.text
                );

            if (
                player == null ||
                player.presence == null ||
                player.presence.position == null
            )
            {
                onFailure?.Invoke(
                    "Player response did not contain valid world presence."
                );

                yield break;
            }

            onSuccess?.Invoke(player);
        }

        public IEnumerator UpdatePosition(
            Vector3 position,
            float rotationY,
            int expectedVersion,
            Action<PlayerResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke(
                    "Cannot update position without an authenticated session."
                );

                yield break;
            }

            UpdatePlayerPositionRequest payload =
                new UpdatePlayerPositionRequest
                {
                    position = new PlayerPositionResponse
                    {
                        x = position.x,
                        y = position.y,
                        z = position.z
                    },
                    rotationY = rotationY,
                    expectedVersion = expectedVersion
                };

            string json = JsonUtility.ToJson(payload);

            using UnityWebRequest request = new UnityWebRequest(
                $"{ApiConfig.BaseUrl}/me/position",
                "PATCH"
            );

            request.uploadHandler = new UploadHandlerRaw(
                Encoding.UTF8.GetBytes(json)
            );

            request.downloadHandler =
                new DownloadHandlerBuffer();

            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );

            ApplyAuthorization(request, session);

            request.timeout = 15;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Position update failed: " +
                    $"{request.responseCode} " +
                    $"{request.downloadHandler.text}"
                );

                yield break;
            }

            PlayerResponse player =
                JsonUtility.FromJson<PlayerResponse>(
                    request.downloadHandler.text
                );

            if (
                player == null ||
                player.presence == null
            )
            {
                onFailure?.Invoke(
                    "Position update returned invalid player state."
                );

                yield break;
            }

            onSuccess?.Invoke(player);
        }

        private static void ApplyAuthorization(
            UnityWebRequest request,
            SessionManager session
        )
        {
            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );
        }
    }
}
