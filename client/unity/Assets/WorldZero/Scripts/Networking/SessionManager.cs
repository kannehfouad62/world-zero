using UnityEngine;

namespace WorldZero.Networking
{
    public sealed class SessionManager : MonoBehaviour
    {
        public static SessionManager Instance { get; private set; }

        public bool IsAuthenticated =>
            !string.IsNullOrWhiteSpace(AccessToken);

        public string AccessToken { get; private set; }

        public string RefreshToken { get; private set; }

        public AuthPlayerSummary Player { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        public void SetSession(AuthResponse response)
        {
            AccessToken = response.accessToken;
            RefreshToken = response.refreshToken;
            Player = response.player;

            Debug.Log(
                $"Authenticated as {Player.displayName} " +
                $"(@{Player.username})"
            );
        }

        public void ClearSession()
        {
            AccessToken = null;
            RefreshToken = null;
            Player = null;
        }
    }
}
