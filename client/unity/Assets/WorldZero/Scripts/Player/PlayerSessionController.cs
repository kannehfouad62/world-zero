using System.Collections;
using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.Player
{
    public sealed class PlayerSessionController : MonoBehaviour
    {
        [SerializeField]
        private PlayerApiClient playerApiClient;

        [SerializeField]
        private float synchronizationInterval = 2f;

        [SerializeField]
        private float minimumMovementDistance = 0.25f;

        private PlayerMovement playerMovement;
        private Vector3 lastSynchronizedPosition;

        private bool authoritativeStateLoaded;
        private bool synchronizationInProgress;

        private float synchronizationTimer;

        public int PresenceVersion { get; private set; }

        private void Awake()
        {
            playerMovement = GetComponent<PlayerMovement>();
        }

        private void Update()
        {
            if (
                !authoritativeStateLoaded ||
                synchronizationInProgress ||
                SessionManager.Instance == null ||
                !SessionManager.Instance.IsAuthenticated
            )
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

            if (playerMovement != null)
            {
                playerMovement.enabled = false;
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

                if (playerMovement != null)
                {
                    playerMovement.enabled = true;
                }

                yield break;
            }

            if (loadedPlayer == null)
            {
                Debug.LogError(
                    "Authoritative player state was not loaded."
                );

                if (playerMovement != null)
                {
                    playerMovement.enabled = true;
                }

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

            if (!string.IsNullOrWhiteSpace(failure))
            {
                Debug.LogWarning(failure);

                synchronizationInProgress = false;
                yield break;
            }

            if (updatedPlayer?.presence == null)
            {
                Debug.LogWarning(
                    "Position synchronization returned invalid state."
                );

                synchronizationInProgress = false;
                yield break;
            }

            PresenceVersion = updatedPlayer.presence.version;

            lastSynchronizedPosition = transform.position;

            Debug.Log(
                $"Position synchronized | " +
                $"Version {PresenceVersion} | " +
                $"({updatedPlayer.presence.position.x}, " +
                $"{updatedPlayer.presence.position.y}, " +
                $"{updatedPlayer.presence.position.z})"
            );

            synchronizationInProgress = false;
        }

        private void ApplyAuthoritativeState(PlayerResponse player)
        {
            PlayerPresenceResponse presence = player.presence;

            CharacterController controller =
                GetComponent<CharacterController>();

            if (controller != null)
            {
                controller.enabled = false;
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

            if (controller != null)
            {
                controller.enabled = true;
            }

            if (playerMovement != null)
            {
                playerMovement.enabled = true;
            }

            Debug.Log(
                $"Loaded {player.displayName} from server | " +
                $"District: {presence.districtName} | " +
                $"Position: ({presence.position.x}, " +
                $"{presence.position.y}, " +
                $"{presence.position.z}) | " +
                $"Version: {presence.version}"
            );
        }
    }
}
