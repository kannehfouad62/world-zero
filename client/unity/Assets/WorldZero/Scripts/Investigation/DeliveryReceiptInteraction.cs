using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using WorldZero.Networking;

namespace WorldZero.Investigation
{
    public sealed class DeliveryReceiptInteraction : MonoBehaviour
    {
        private const string ClueSlug = "maya-delivery-receipt";
        private const float InteractionDistance = 3f;
        private const float StatusRetryDelay = 5f;

        [Header("Scene References")]
        [SerializeField]
        private Transform player;

        [Header("Clue Position")]
        [SerializeField]
        private Vector3 cluePosition = new Vector3(-27f, 0f, 14f);

        [Header("Diagnostics")]
        [SerializeField]
        private bool enableDebugLogging = true;

        private GameObject clueObject;

        private string currentPlayerId = "";
        private string message = "";

        private bool statusKnown;
        private bool statusLoading;
        private bool inspecting;
        private bool discovered;
        private bool canInspect;
        private bool outcomeUncertain;

        private int currentStep;
        private float nextStatusRetry;

        private Coroutine activeRequest;

        [Serializable]
        private sealed class ClueStatusResponse
        {
            public bool available;
            public bool discovered;
            public string discoveredAt;
            public int currentStep;
            public bool canInspect;
        }

        [Serializable]
        private sealed class InspectionProgress
        {
            public string status;
            public int previousStep;
            public int currentStep;
        }

        [Serializable]
        private sealed class InspectionResponse
        {
            public InspectionProgress progress;
            public string message;
        }

        private void Awake()
        {
            FindPlayer();
            CreateClueVisual();
        }

        private void FindPlayer()
        {
            if (player != null)
            {
                return;
            }

            var controller =
                FindFirstObjectByType<
                    WorldZero.Player.PlayerSessionController
                >();

            if (controller != null)
            {
                player = controller.transform;
            }
        }

        private void CreateClueVisual()
        {
            clueObject = GameObject.CreatePrimitive(
                PrimitiveType.Cube
            );

            clueObject.name =
                "Evidence - Missing Delivery Receipt";

            clueObject.transform.position =
                cluePosition + Vector3.up * 0.15f;

            clueObject.transform.localScale =
                new Vector3(0.7f, 0.08f, 0.5f);

            // This small evidence marker should not obstruct
            // the player's movement.
            Collider clueCollider =
                clueObject.GetComponent<Collider>();

            if (clueCollider != null)
            {
                Destroy(clueCollider);
            }

            Renderer renderer =
                clueObject.GetComponent<Renderer>();

            Shader shader = Shader.Find(
                "Universal Render Pipeline/Lit"
            );

            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            if (shader != null && renderer != null)
            {
                Material material = new Material(shader);
                material.color = Color.yellow;
                renderer.material = material;
            }

            GameObject label =
                new GameObject("Evidence Label");

            label.transform.SetParent(
                clueObject.transform,
                false
            );

            label.transform.localPosition =
                new Vector3(0f, 8f, 0f);

            TextMesh text = label.AddComponent<TextMesh>();

            text.text = "Delivery Receipt";
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.12f;
            text.fontSize = 36;
        }

        private void Update()
        {
            if (player == null)
            {
                FindPlayer();
            }

            SessionManager session =
                SessionManager.Instance;

            if (
                session == null ||
                !session.IsAuthenticated ||
                session.Player == null
            )
            {
                if (!string.IsNullOrEmpty(currentPlayerId))
                {
                    ResetSession();
                }

                return;
            }

            string playerId = session.Player.id;

            if (currentPlayerId != playerId)
            {
                ResetSession();
                currentPlayerId = playerId;
                RequestStatus();
            }

            // Retry only read-only status requests.
            // Never automatically retry a POST.
            if (
                !statusKnown &&
                !statusLoading &&
                !inspecting &&
                activeRequest == null &&
                Time.unscaledTime >= nextStatusRetry
            )
            {
                RequestStatus();
            }
        }

        private void RequestStatus()
        {
            if (
                string.IsNullOrEmpty(currentPlayerId) ||
                statusLoading ||
                inspecting ||
                activeRequest != null
            )
            {
                return;
            }

            statusLoading = true;
            nextStatusRetry =
                Time.unscaledTime + StatusRetryDelay;

            activeRequest = StartCoroutine(
                FetchStatus(currentPlayerId)
            );
        }

        private IEnumerator FetchStatus(
            string requestPlayerId
        )
        {
            SessionManager session =
                SessionManager.Instance;

            if (
                session == null ||
                !session.IsAuthenticated
            )
            {
                statusLoading = false;
                activeRequest = null;
                yield break;
            }

            string accessToken = session.AccessToken;

            string url =
                $"{ApiConfig.BaseUrl}/me/clues/{ClueSlug}/status";

            using UnityWebRequest request =
                UnityWebRequest.Get(url);

            request.timeout = 15;

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {accessToken}"
            );

            yield return request.SendWebRequest();

            if (requestPlayerId != currentPlayerId)
            {
                yield break;
            }

            statusLoading = false;
            activeRequest = null;

            if (
                request.result !=
                UnityWebRequest.Result.Success
            )
            {
                statusKnown = false;
                message = outcomeUncertain
                    ? "Unable to verify the inspection outcome."
                    : "Unable to load evidence status.";

                nextStatusRetry =
                    Time.unscaledTime + StatusRetryDelay;

                Debug.LogWarning(
                    $"Clue status HTTP {request.responseCode}: " +
                    request.error
                );

                yield break;
            }

            ClueStatusResponse response;

            try
            {
                response =
                    JsonUtility.FromJson<ClueStatusResponse>(
                        request.downloadHandler.text
                    );
            }
            catch (Exception exception)
            {
                statusKnown = false;
                message = "Invalid evidence status response.";

                nextStatusRetry =
                    Time.unscaledTime + StatusRetryDelay;

                Debug.LogWarning(exception.Message);
                yield break;
            }

            if (response == null)
            {
                statusKnown = false;
                message = "Empty evidence status response.";

                nextStatusRetry =
                    Time.unscaledTime + StatusRetryDelay;

                yield break;
            }

            statusKnown = true;
            discovered = response.discovered;
            canInspect = response.canInspect;
            currentStep = response.currentStep;

            // The authoritative status request has now
            // reconciled any uncertain POST outcome.
            outcomeUncertain = false;

            if (clueObject != null)
            {
                clueObject.SetActive(
                    response.available && !discovered
                );
            }

            if (discovered)
            {
                message = "Delivery receipt already discovered.";

                if (enableDebugLogging)
                {
                    Debug.Log(
                        "WORLD ZERO: Receipt discovery confirmed. " +
                        $"Investigation step: {currentStep}"
                    );
                }
            }
            else if (!response.available)
            {
                message = "This evidence is unavailable.";
            }
            else if (!canInspect)
            {
                message =
                    "This evidence is not available at your current step.";
            }
            else
            {
                message = "";
            }
        }

        private bool IsNearClue()
        {
            return player != null &&
                Vector3.Distance(
                    player.position,
                    cluePosition
                ) <= InteractionDistance;
        }

        private void OnGUI()
        {
            SessionManager session =
                SessionManager.Instance;

            if (
                session == null ||
                !session.IsAuthenticated ||
                string.IsNullOrEmpty(currentPlayerId) ||
                !IsNearClue() ||
                discovered
            )
            {
                return;
            }

            float width =
                Mathf.Min(400f, Screen.width - 20f);

            float x =
                (Screen.width - width) / 2f;

            float y =
                Mathf.Max(10f, Screen.height - 185f);

            GUI.Box(
                new Rect(x, y, width, 165f),
                "INVESTIGATION EVIDENCE"
            );

            GUI.Label(
                new Rect(x + 15f, y + 35f, width - 30f, 25f),
                "Missing Delivery Receipt"
            );

            if (inspecting || statusLoading)
            {
                GUI.Label(
                    new Rect(x + 15f, y + 75f, width - 30f, 35f),
                    inspecting
                        ? "Inspecting evidence..."
                        : "Checking evidence status..."
                );

                return;
            }

            if (!statusKnown)
            {
                GUI.Label(
                    new Rect(x + 15f, y + 65f, width - 30f, 40f),
                    outcomeUncertain
                        ? "Verifying whether inspection was saved..."
                        : "Evidence status unavailable."
                );

                if (
                    GUI.Button(
                        new Rect(x + 15f, y + 110f, width - 30f, 35f),
                        "Check Server Status"
                    )
                )
                {
                    nextStatusRetry = 0f;
                    RequestStatus();
                }

                return;
            }

            if (!canInspect)
            {
                GUI.Label(
                    new Rect(x + 15f, y + 75f, width - 30f, 55f),
                    message
                );

                return;
            }

            if (
                GUI.Button(
                    new Rect(x + 15f, y + 75f, width - 30f, 40f),
                    "Inspect Evidence"
                )
            )
            {
                StartInspection();
            }

            if (!string.IsNullOrEmpty(message))
            {
                GUI.Label(
                    new Rect(x + 15f, y + 125f, width - 30f, 25f),
                    message
                );
            }
        }

        private void StartInspection()
        {
            if (
                !statusKnown ||
                !canInspect ||
                discovered ||
                inspecting ||
                statusLoading ||
                activeRequest != null ||
                !IsNearClue()
            )
            {
                return;
            }

            inspecting = true;
            message = "Inspecting delivery receipt...";

            activeRequest = StartCoroutine(
                InspectReceipt(currentPlayerId)
            );
        }

        private IEnumerator InspectReceipt(
            string requestPlayerId
        )
        {
            SessionManager session =
                SessionManager.Instance;

            if (
                session == null ||
                !session.IsAuthenticated
            )
            {
                inspecting = false;
                activeRequest = null;
                yield break;
            }

            string accessToken = session.AccessToken;

            string url =
                $"{ApiConfig.BaseUrl}/me/clues/{ClueSlug}/inspect";

            using UnityWebRequest request =
                new UnityWebRequest(url, "POST");

            request.downloadHandler =
                new DownloadHandlerBuffer();

            request.uploadHandler =
                new UploadHandlerRaw(
                    System.Text.Encoding.UTF8.GetBytes("{}")
                );

            request.SetRequestHeader(
                "Content-Type",
                "application/json"
            );

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {accessToken}"
            );

            request.timeout = 15;

            yield return request.SendWebRequest();

            if (requestPlayerId != currentPlayerId)
            {
                yield break;
            }

            inspecting = false;
            activeRequest = null;

            if (
                request.result ==
                UnityWebRequest.Result.Success
            )
            {
                InspectionResponse response = null;

                try
                {
                    response =
                        JsonUtility.FromJson<InspectionResponse>(
                            request.downloadHandler.text
                        );
                }
                catch (Exception exception)
                {
                    Debug.LogWarning(exception.Message);
                }

                if (
                    response != null &&
                    response.progress != null &&
                    response.progress.currentStep == 1
                )
                {
                    discovered = true;
                    statusKnown = true;
                    canInspect = false;
                    currentStep = 1;
                    outcomeUncertain = false;

                    message = "Delivery receipt discovered!";

                    if (clueObject != null)
                    {
                        clueObject.SetActive(false);
                    }

                    Debug.Log(
                        "WORLD ZERO: Delivery receipt discovered. " +
                        "Investigation advanced to step 1."
                    );

                    yield break;
                }
            }

            // A network failure or unexpected response
            // does not establish whether the server
            // committed the transaction.
            outcomeUncertain = true;
            statusKnown = false;
            canInspect = false;

            message =
                "Checking whether the discovery was saved...";

            Debug.LogWarning(
                $"Receipt inspection outcome uncertain. " +
                $"HTTP {request.responseCode}"
            );

            // Do not repeat the POST.
            // Only a read-only GET may reconcile the outcome.
            RequestStatus();
        }

        private void ResetSession()
        {
            if (activeRequest != null)
            {
                StopCoroutine(activeRequest);
                activeRequest = null;
            }

            currentPlayerId = "";
            message = "";

            statusKnown = false;
            statusLoading = false;
            inspecting = false;
            discovered = false;
            canInspect = false;
            outcomeUncertain = false;

            currentStep = 0;
            nextStatusRetry = 0f;

            if (clueObject != null)
            {
                clueObject.SetActive(true);
            }
        }

        private void OnDisable()
        {
            ResetSession();
        }

        private void OnDestroy()
        {
            if (clueObject != null)
            {
                Destroy(clueObject);
            }
        }
    }
}
