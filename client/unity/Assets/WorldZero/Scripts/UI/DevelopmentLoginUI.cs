using UnityEngine;
using WorldZero.Networking;
using WorldZero.Player;

namespace WorldZero.UI
{
    public sealed class DevelopmentLoginUI : MonoBehaviour
    {
        private string email = "";
        private string password = "";
        private string status = "Sign in to WORLD ZERO";

        private bool isLoggingIn;

        private AuthApiClient authApiClient;

        private PlayerSessionController playerSessionController;

        private void Awake()
{
    authApiClient = GetComponent<AuthApiClient>();

    playerSessionController =
        FindFirstObjectByType<PlayerSessionController>();
}

        private void OnGUI()
        {
            if (
                SessionManager.Instance != null &&
                SessionManager.Instance.IsAuthenticated
            )
            {
                GUI.Box(
                    new Rect(20, 20, 320, 80),
                    "WORLD ZERO"
                );

                GUI.Label(
                    new Rect(40, 50, 280, 25),
                    $"Signed in as " +
                    $"{SessionManager.Instance.Player.displayName}"
                );

                return;
            }

            GUI.Box(
                new Rect(20, 20, 360, 220),
                "WORLD ZERO — The Living World"
            );

            GUI.Label(
                new Rect(40, 55, 320, 25),
                "Email"
            );

            email = GUI.TextField(
                new Rect(40, 80, 320, 30),
                email
            );

            GUI.Label(
                new Rect(40, 115, 320, 25),
                "Password"
            );

            password = GUI.PasswordField(
                new Rect(40, 140, 320, 30),
                password,
                '*'
            );

            GUI.enabled = !isLoggingIn;

            if (
                GUI.Button(
                    new Rect(40, 180, 320, 35),
                    isLoggingIn ? "Signing in..." : "Sign In"
                )
            )
            {
                BeginLogin();
            }

            GUI.enabled = true;

            GUI.Label(
                new Rect(40, 218, 320, 25),
                status
            );
        }

        private void BeginLogin()
        {
            if (
                string.IsNullOrWhiteSpace(email) ||
                string.IsNullOrWhiteSpace(password)
            )
            {
                status = "Email and password are required.";
                return;
            }

            isLoggingIn = true;
            status = "Connecting...";

            StartCoroutine(
                authApiClient.Login(
                    email,
                    password,
                    HandleLoginSuccess,
                    HandleLoginFailure
                )
            );
        }

        private void HandleLoginSuccess(AuthResponse response)
        {
            SessionManager.Instance.SetSession(response);
            if (playerSessionController != null)
{
    StartCoroutine(
        playerSessionController.LoadAuthoritativeState()
    );
}
else
{
    Debug.LogError(
        "PlayerSessionController was not found in the scene."
    );
}

            password = "";
            isLoggingIn = false;
            status = "Connected.";
        }

        private void HandleLoginFailure(string message)
        {
            password = "";
            isLoggingIn = false;
            status = message;

            Debug.LogWarning(message);
        }
    }
}
