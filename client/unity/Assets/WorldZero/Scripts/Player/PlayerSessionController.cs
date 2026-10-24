using System.Collections;
using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.Player
{
    [RequireComponent(typeof(PlayerMovement))]
    public sealed class PlayerSessionController : MonoBehaviour
    {
        [Header("Networking")]
        [SerializeField]
        private PlayerApiClient playerApiClient;

        [Header("Synchronization")]
        [SerializeField]
        private float synchronizationInterval = 2f;

        [SerializeField]
        private float minimumMovementDistance = 0.25f;

        [Header("District 01 Safety")]
        [SerializeField]
        private float horizontalBoundary = 65f;

        [SerializeField]
        private float minimumPlayerHeight = 0.25f;

        [SerializeField]
        private float maximumPlayerHeight = 11f;

        [SerializeField]
        private float recoveryRetryInterval = 5f;

        private PlayerMovement playerMovement;
        private CharacterController characterController;

        private Vector3 lastSynchronizedPosition;

        private bool authoritativeStateLoaded;
        private bool synchronizationInProgress;
        private bool recoveryInProgress;
        private bool recoveryRequired;

        private float synchronizationTimer;
        private float nextRecoveryAttempt;

        public int PresenceVersion { get; private set; }

        private void Awake()
        {
            playerMovement = GetComponent<PlayerMovement>();
            characterController =
                GetComponent<CharacterController>();
        }

        private void Update()
        {
            SessionManager session = SessionManager.Instance;

            if (
                session == null ||
                !session.IsAuthenticated
            )
            {
                authoritativeStateLoaded = false;
                recoveryRequired = false;

                if (playerMovement != null)
                {
                    playerMovement.enabled = false;
                }

                return;
            }

            if (!authoritativeStateLoaded)
            {
                return;
            }

            if (
                recoveryRequired &&
                !recoveryInProgress &&
                Time.unscaledTime >= nextRecoveryAttempt
            )
            {
                StartCoroutine(RecoverFromUnsafePosition());
                return;
            }

            if (recoveryInProgress || recoveryRequired)
            {
                return;
            }

            if (!IsSafeLocalPosition(transform.position))
            {
                recoveryRequired = true;

                if (playerMovement != null)
                {
                    playerMovement.enabled = false;
                }

                StartCoroutine(RecoverFromUnsafePosition());
                return;
            }

            if (synchronizationInProgress)
            {
                return;
            }

            synchronizationTimer += Time.deltaTime;

            if (synchronizationTimer < synchronizationInterval)
            {
                return;
            }

            synchronizationTimer = 0f;

            float distance = Vector3.Distance(
                transform.position,
                lastSynchronizedPosition
            );

            if (distance < minimumMovementDistance)
            {
                return;
            }

            StartCoroutine(SynchronizePosition());
        }

        private bool IsSafeLocalPosition(Vector3 position)
        {
            return
                IsFinite(position.x) &&
                IsFinite(position.y) &&
                IsFinite(position.z) &&
                Mathf.Abs(position.x) <= horizontalBoundary &&
                Mathf.Abs(position.z) <= horizontalBoundary &&
                position.y >= minimumPlayerHeight &&
                position.y <= maximumPlayerHeight;
        }

        private static bool IsFinite(float value)
        {
            return !float.IsNaN(value) &&
                   !float.IsInfinity(value);
        }

        private bool IsSafeServerPosition(
            PlayerPositionResponse position
        )
        {
            if (position == null)
            {
                return false;
            }

            Vector3 localPosition = new Vector3(
                position.x,
                position.y + 1f,
                position.z
            );

            return IsSafeLocalPosition(localPosition);
        }

        public IEnumerator LoadAuthoritativeState()
        {
            if (playerApiClient == null)
            {
                Debug.LogError(
                    "PlayerSessionController requires PlayerApiClient."
                );
                yield break;
            }

            authoritativeStateLoaded = false;
            recoveryRequired = false;

            if (playerMovement != null)
            {
                playerMovement.enabled = false;
            }

            while (synchronizationInProgress)
            {
                yield return null;
            }

            PlayerResponse loadedPlayer = null;
            string failure = null;

            yield return playerApiClient.GetCurrentPlayer(
                response => loadedPlayer = response,
                error => failure = error
            );

            if (!string.IsNullOrWhiteSpace(failure))
            {
                Debug.LogError(failure);
                yield break;
            }

            if (
                loadedPlayer?.presence == null ||
                !IsSafeServerPosition(
                    loadedPlayer.presence.position
                )
            )
            {
                Debug.LogError(
                    "Authoritative player position is unsafe. " +
                    "Server recovery is required."
                );
                yield break;
            }

            ApplyAuthoritativeState(loadedPlayer);

            authoritativeStateLoaded = true;
        }

        private IEnumerator SynchronizePosition()
        {
            synchronizationInProgress = true;

            Vector3 serverPosition = new Vector3(
                transform.position.x,
                transform.position.y - 1f,
                transform.position.z
            );

            if (!IsSafeLocalPosition(transform.position))
            {
                synchronizationInProgress = false;
                recoveryRequired = true;

                if (playerMovement != null)
                {
                    playerMovement.enabled = false;
                }

                yield break;
            }

            float rotationY = transform.eulerAngles.y;

            PlayerResponse updatedPlayer = null;
            string failure = null;

            yield return playerApiClient.UpdatePosition(
                serverPosition,
                rotationY,
                PresenceVersion,
                response => updatedPlayer = response,
                error => failure = error
            );

            synchronizationInProgress = false;

            if (!string.IsNullOrWhiteSpace(failure))
            {
                Debug.LogWarning(failure);

                // A failed response may mean the server state
                // changed. Reload before another update.
                recoveryRequired = true;

                if (playerMovement != null)
                {
                    playerMovement.enabled = false;
                }

                yield break;
            }

            if (updatedPlayer?.presence == null)
            {
                Debug.LogWarning(
                    "Position synchronization returned invalid state."
                );

                recoveryRequired = true;

                if (playerMovement != null)
                {
                    playerMovement.enabled = false;
                }

                yield break;
            }

            PresenceVersion = updatedPlayer.presence.version;

            lastSynchronizedPosition = new Vector3(
                updatedPlayer.presence.position.x,
                updatedPlayer.presence.position.y + 1f,
                updatedPlayer.presence.position.z
            );

            Debug.Log(
                $"Position synchronized | Version {PresenceVersion}"
            );
        }

        private IEnumerator RecoverFromUnsafePosition()
        {
            if (recoveryInProgress)
            {
                yield break;
            }

            recoveryInProgress = true;
            recoveryRequired = true;

            if (playerMovement != null)
            {
                playerMovement.enabled = false;
            }

            Debug.LogWarning(
                "WORLD ZERO: Unsafe position detected. " +
                "Restoring authoritative player state."
            );

            // Never apply a recovery state while a previous
            // movement request is still being processed.
            while (synchronizationInProgress)
            {
                yield return null;
            }

            PlayerResponse recoveredPlayer = null;
            string failure = null;

            yield return playerApiClient.GetCurrentPlayer(
                response => recoveredPlayer = response,
                error => failure = error
            );

            if (
                !string.IsNullOrWhiteSpace(failure) ||
                recoveredPlayer?.presence == null ||
                !IsSafeServerPosition(
                    recoveredPlayer.presence.position
                )
            )
            {
                Debug.LogError(
                    "Automatic local recovery could not load " +
                    "a safe authoritative position. " +
                    failure
                );

                nextRecoveryAttempt =
                    Time.unscaledTime +
                    Mathf.Max(1f, recoveryRetryInterval);

                recoveryInProgress = false;
                yield break;
            }

            ApplyAuthoritativeState(recoveredPlayer);

            recoveryRequired = false;
            recoveryInProgress = false;

            Debug.Log(
                "WORLD ZERO: Player recovered successfully."
            );
        }

        private void ApplyAuthoritativeState(
            PlayerResponse player
        )
        {
            PlayerPresenceResponse presence = player.presence;

            if (characterController != null)
            {
                characterController.enabled = false;
            }

            transform.position = new Vector3(
                presence.position.x,
                presence.position.y + 1f,
                presence.position.z
            );

            transform.rotation = Quaternion.Euler(
                0f,
                presence.rotationY,
                0f
            );

            PresenceVersion = presence.version;

            lastSynchronizedPosition = transform.position;
            synchronizationTimer = 0f;

            if (playerMovement != null)
            {
                playerMovement.ResetVerticalVelocity();
            }

            if (characterController != null)
            {
                characterController.enabled = true;
            }

            if (playerMovement != null)
            {
                playerMovement.enabled = true;
            }

            Debug.Log(
                $"Loaded {player.displayName} from server | " +
                $"District: {presence.districtName} | " +
                $"Version: {presence.version}"
            );
        }
    }
}
