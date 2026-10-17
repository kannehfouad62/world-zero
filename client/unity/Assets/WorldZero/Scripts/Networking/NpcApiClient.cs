using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class NpcApiClient : MonoBehaviour
    {
        private const int RequestTimeoutSeconds = 15;

        public IEnumerator GetDistrictNpcs(
            string districtSlug,
            Action<NpcResponse[]> onSuccess,
            Action<string> onFailure
        )
        {
            if (string.IsNullOrWhiteSpace(districtSlug))
            {
                onFailure?.Invoke("District identifier is required.");
                yield break;
            }

            string url =
                $"{ApiConfig.BaseUrl}/npcs/district/" +
                UnityWebRequest.EscapeURL(districtSlug);

            using UnityWebRequest request =
                UnityWebRequest.Get(url);

            request.timeout = RequestTimeoutSeconds;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"NPC load failed: HTTP {request.responseCode} " +
                    $"{request.error}"
                );

                yield break;
            }

            string responseJson = request.downloadHandler.text;

            // Unity JsonUtility does not directly support
            // top-level JSON arrays.
            string wrappedJson =
                "{\"items\":" + responseJson + "}";

            NpcListResponse response;

            try
            {
                response = JsonUtility.FromJson<NpcListResponse>(
                    wrappedJson
                );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(
                    $"NPC response parsing failed: {exception.Message}"
                );

                yield break;
            }

            if (response == null || response.items == null)
            {
                onFailure?.Invoke(
                    "NPC response could not be parsed."
                );

                yield break;
            }

            onSuccess?.Invoke(response.items);
        }

        public IEnumerator GetMayaDecisionStatus(
            Action<MayaDecisionStatusResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke(
                    "Authentication is required to check Maya's memory."
                );

                yield break;
            }

            string url =
                $"{ApiConfig.BaseUrl}/npcs/maya/decision-status";

            using UnityWebRequest request =
                UnityWebRequest.Get(url);

            request.timeout = RequestTimeoutSeconds;

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Maya decision status failed: " +
                    $"HTTP {request.responseCode} " +
                    $"{request.error}"
                );

                yield break;
            }

            MayaDecisionStatusResponse response;

            try
            {
                response =
                    JsonUtility.FromJson<MayaDecisionStatusResponse>(
                        request.downloadHandler.text
                    );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(
                    $"Decision status parsing failed: " +
                    $"{exception.Message}"
                );

                yield break;
            }

            if (
                response == null ||
                string.IsNullOrWhiteSpace(response.eventId)
            )
            {
                onFailure?.Invoke(
                    "Invalid Maya decision-status response."
                );

                yield break;
            }

            onSuccess?.Invoke(response);
        }

        public IEnumerator RecordMayaHelpDecision(
            string decision,
            Action<MayaInteractionResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke(
                    "Authentication is required for NPC interaction."
                );

                yield break;
            }

            if (decision != "HELP" && decision != "REFUSE")
            {
                onFailure?.Invoke(
                    "Invalid Maya decision. Expected HELP or REFUSE."
                );

                yield break;
            }

            MayaHelpDecisionRequest payload =
                new MayaHelpDecisionRequest
                {
                    decision = decision
                };

            string json = JsonUtility.ToJson(payload);

            string url =
                $"{ApiConfig.BaseUrl}/npcs/maya/help-decision";

            using UnityWebRequest request =
                new UnityWebRequest(url, "POST");

            request.uploadHandler =
                new UploadHandlerRaw(
                    Encoding.UTF8.GetBytes(json)
                );

            request.downloadHandler =
                new DownloadHandlerBuffer();

            request.timeout = RequestTimeoutSeconds;

            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Maya interaction failed: " +
                    $"HTTP {request.responseCode} " +
                    $"{request.error}"
                );

                yield break;
            }

            MayaInteractionResponse response;

            try
            {
                response =
                    JsonUtility.FromJson<MayaInteractionResponse>(
                        request.downloadHandler.text
                    );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(
                    $"Maya interaction parsing failed: " +
                    $"{exception.Message}"
                );

                yield break;
            }

            if (
                response == null ||
                response.npc == null ||
                response.relationship == null ||
                response.memory == null
            )
            {
                onFailure?.Invoke(
                    "Maya interaction returned incomplete data."
                );

                yield break;
            }

            onSuccess?.Invoke(response);
        }
    }
}
