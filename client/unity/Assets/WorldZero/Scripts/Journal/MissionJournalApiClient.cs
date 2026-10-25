using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using WorldZero.Networking;

namespace WorldZero.Journal
{
    public sealed class MissionJournalApiClient : MonoBehaviour
    {
        private const int RequestTimeoutSeconds = 15;

        public IEnumerator GetMissionJournal(
            Action<MissionJournalResponse> onSuccess,
            Action<string> onFailure
        )
        {
            SessionManager session = SessionManager.Instance;

            if (session == null ||
                !session.IsAuthenticated ||
                session.Player == null)
            {
                onFailure?.Invoke(
                    "Authentication is required to load the mission journal.");
                yield break;
            }

            string requestedPlayerId = session.Player.id;

            using UnityWebRequest request = UnityWebRequest.Get(
                $"{ApiConfig.BaseUrl}/me/mission-journal"
            );

            request.timeout = RequestTimeoutSeconds;

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}"
            );

            yield return request.SendWebRequest();

            SessionManager currentSession = SessionManager.Instance;

            if (currentSession == null ||
                !currentSession.IsAuthenticated ||
                currentSession.Player == null ||
                currentSession.Player.id != requestedPlayerId)
            {
                onFailure?.Invoke(
                    "The player session changed while loading the journal.");
                yield break;
            }

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure?.Invoke(
                    $"Mission journal request failed: HTTP {request.responseCode} " +
                    request.error
                );
                yield break;
            }

            MissionJournalResponse response;

            try
            {
                response = JsonUtility.FromJson<MissionJournalResponse>(
                    request.downloadHandler.text
                );
            }
            catch (Exception exception)
            {
                onFailure?.Invoke(
                    "Unable to parse mission journal: " +
                    exception.Message
                );
                yield break;
            }

            if (response == null || response.missions == null)
            {
                onFailure?.Invoke(
                    "The server returned an invalid mission journal.");
                yield break;
            }

            onSuccess?.Invoke(response);
        }
    }
}
