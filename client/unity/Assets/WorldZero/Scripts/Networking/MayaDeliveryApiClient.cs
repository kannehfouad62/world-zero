using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class MayaDeliveryApiClient : MonoBehaviour
    {
        private const int TimeoutSeconds = 15;

        public IEnumerator GetDeliveryStatus(
            Action<MayaDeliveryStatusResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke("Authentication required.");
                yield break;
            }

            string playerId = session.Player?.id;

            using UnityWebRequest request = UnityWebRequest.Get(
                $"{ApiConfig.BaseUrl}/me/maya/delivery-status"
            );

            request.timeout = TimeoutSeconds;

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );

            yield return request.SendWebRequest();

            if (!IsSameSession(playerId))
            {
                onFailure?.Invoke("Player session changed.");
                yield break;
            }

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Delivery status HTTP {request.responseCode}: " +
                    request.error
                );
                yield break;
            }

            MayaDeliveryStatusResponse response;

            try
            {
                response =
                    JsonUtility.FromJson<MayaDeliveryStatusResponse>(
                        request.downloadHandler.text
                    );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(exception.Message);
                yield break;
            }

            if (response == null ||
                response.eventSlug != "maya-stolen-supplies-01")
            {
                onFailure?.Invoke("Invalid delivery status response.");
                yield break;
            }

            onSuccess?.Invoke(response);
        }

        public IEnumerator DeliverSupplies(
            Action<MayaDeliveryResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                onFailure?.Invoke("Authentication required.");
                yield break;
            }

            string playerId = session.Player?.id;

            using UnityWebRequest request = new UnityWebRequest(
                $"{ApiConfig.BaseUrl}/me/maya/deliver-supplies",
                "POST"
            );

            request.uploadHandler = new UploadHandlerRaw(
                Encoding.UTF8.GetBytes("{}")
            );

            request.downloadHandler = new DownloadHandlerBuffer();
            request.timeout = TimeoutSeconds;

            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );

            yield return request.SendWebRequest();

            if (!IsSameSession(playerId))
            {
                onFailure?.Invoke("Player session changed.");
                yield break;
            }

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Supply delivery HTTP {request.responseCode}: " +
                    request.error
                );
                yield break;
            }

            MayaDeliveryResponse response;

            try
            {
                response =
                    JsonUtility.FromJson<MayaDeliveryResponse>(
                        request.downloadHandler.text
                    );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(exception.Message);
                yield break;
            }

            if (response == null ||
                response.status != "COMPLETED" ||
                response.currentStep != 4 ||
                response.relationship == null ||
                response.memory == null)
            {
                onFailure?.Invoke("Invalid mission completion response.");
                yield break;
            }

            onSuccess?.Invoke(response);
        }

        private static bool IsSameSession(string playerId)
        {
            SessionManager session = SessionManager.Instance;

            return session != null &&
                session.IsAuthenticated &&
                session.Player != null &&
                session.Player.id == playerId;
        }
    }
}
