using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace WorldZero.Networking
{
    public sealed class AuthApiClient : MonoBehaviour
    {
        public IEnumerator Login(
            string email,
            string password,
            Action<AuthResponse> onSuccess,
            Action<string> onFailure
        )
        {
            LoginRequest payload = new LoginRequest
            {
                email = email,
                password = password
            };

            string json = JsonUtility.ToJson(payload);

            using UnityWebRequest request = new UnityWebRequest(
                $"{ApiConfig.BaseUrl}/auth/login",
                UnityWebRequest.kHttpVerbPOST
            );

            byte[] body = Encoding.UTF8.GetBytes(json);

            request.uploadHandler = new UploadHandlerRaw(body);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );

            request.timeout = 15;

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Login failed: {request.responseCode} " +
                    $"{request.downloadHandler.text}"
                );

                yield break;
            }

            AuthResponse response =
                JsonUtility.FromJson<AuthResponse>(
                    request.downloadHandler.text
                );

            if (
                response == null ||
                string.IsNullOrWhiteSpace(response.accessToken)
            )
            {
                onFailure?.Invoke(
                    "Login response did not contain a valid session."
                );

                yield break;
            }

            onSuccess?.Invoke(response);
        }
    }
}
