using System;
using System.Collections;
using UnityEngine;
using WorldZero.Networking;
using WorldZero.NPC;

namespace WorldZero.UI
{
    public sealed class MayaInteractionUI : MonoBehaviour
    {
        private const float InteractionDistance = 5f;
        private const float RetryDelaySeconds = 5f;
        private const float NpcSearchInterval = 1f;

        [Header("Scene References")]
        [SerializeField]
        private Transform player;

        [SerializeField]
        private NpcApiClient npcApiClient;

        [Header("Interaction Settings")]
        [SerializeField]
        private bool enableDebugLogging = true;

        private Transform maya;

        private bool interactionOpen;
        private bool statusLoaded;
        private bool statusLoading;
        private bool hasDecided;
        private bool decisionInProgress;

        private string previousDecision = "";
        private string resultMessage = "";
        private string statusError = "";

        private string loadedPlayerId = "";

        private float nextRetryTime;
        private float nextNpcSearchTime;
        private float nextDebugTime;

        private Coroutine statusCoroutine;
        private Coroutine decisionCoroutine;

        private void Awake()
        {
            if (npcApiClient == null)
            {
                npcApiClient =
                    FindFirstObjectByType<NpcApiClient>();
            }

            if (player == null)
            {
                WorldZero.Player.PlayerSessionController controller =
                    FindFirstObjectByType<
                        WorldZero.Player.PlayerSessionController
                    >();

                if (controller != null)
                {
                    player = controller.transform;
                }
            }
        }

        private void OnEnable()
        {
            nextNpcSearchTime = 0f;
            nextRetryTime = 0f;
        }

        private void Update()
        {
            if (player == null)
            {
                interactionOpen = false;
                return;
            }

            if (maya == null)
            {
                FindMaya();
                interactionOpen = false;
                return;
            }

            SessionManager session =
                SessionManager.Instance;

            bool authenticated =
                session != null &&
                session.IsAuthenticated &&
                session.Player != null;

            if (!authenticated)
            {
                if (!string.IsNullOrEmpty(loadedPlayerId))
                {
                    ResetInteractionState();
                }

                interactionOpen = false;
                return;
            }

            string currentPlayerId = session.Player.id;

            if (loadedPlayerId != currentPlayerId)
            {
                ResetInteractionState();
                loadedPlayerId = currentPlayerId;
            }

            float distance = Vector3.Distance(
                player.position,
                maya.position
            );

            interactionOpen =
                distance <= InteractionDistance;

            if (enableDebugLogging &&
                Time.unscaledTime >= nextDebugTime)
            {
                nextDebugTime =
                    Time.unscaledTime + 3f;

                Debug.Log(
                    $"MAYA UI | " +
                    $"Distance={distance:F2} | " +
                    $"Open={interactionOpen} | " +
                    $"Authenticated={authenticated} | " +
                    $"StatusLoaded={statusLoaded} | " +
                    $"StatusLoading={statusLoading} | " +
                    $"HasDecided={hasDecided} | " +
                    $"ApiAssigned={npcApiClient != null}"
                );
            }

            if (!interactionOpen)
            {
                return;
            }

            if (
                !statusLoaded &&
                !statusLoading &&
                !decisionInProgress &&
                Time.unscaledTime >= nextRetryTime
            )
            {
                RequestDecisionStatus();
            }
        }

        private void FindMaya()
        {
            if (Time.unscaledTime < nextNpcSearchTime)
            {
                return;
            }

            nextNpcSearchTime =
                Time.unscaledTime + NpcSearchInterval;

            GameObject mayaObject =
                GameObject.Find("NPC — Maya");

            if (mayaObject != null)
            {
                maya = mayaObject.transform;

                if (enableDebugLogging)
                {
                    Debug.Log(
                        "MayaInteractionUI: Maya located."
                    );
                }
            }
        }

        private void RequestDecisionStatus()
        {
            if (
                npcApiClient == null ||
                statusLoading ||
                statusLoaded ||
                decisionInProgress
            )
            {
                if (npcApiClient == null)
                {
                    statusError =
                        "NPC API client is not configured.";

                    nextRetryTime =
                        Time.unscaledTime + RetryDelaySeconds;
                }

                return;
            }

            SessionManager session =
                SessionManager.Instance;

            if (
                session == null ||
                !session.IsAuthenticated
            )
            {
                return;
            }

            statusLoading = true;
            statusError = "";

            string requestPlayerId = loadedPlayerId;

            statusCoroutine = StartCoroutine(
                LoadDecisionStatus(requestPlayerId)
            );
        }

        private IEnumerator LoadDecisionStatus(
            string requestPlayerId
        )
        {
            MayaDecisionStatusResponse response = null;
            string error = null;

            yield return npcApiClient.GetMayaDecisionStatus(
                value => response = value,
                failure => error = failure
            );

            statusCoroutine = null;

            if (requestPlayerId != loadedPlayerId)
            {
                yield break;
            }

            statusLoading = false;

            if (!string.IsNullOrEmpty(error))
            {
                HandleStatusFailure(error);
                yield break;
            }

            if (response == null)
            {
                HandleStatusFailure(
                    "Empty decision-status response."
                );

                yield break;
            }

            HandleStatusSuccess(response);
        }

        private void HandleStatusSuccess(
            MayaDecisionStatusResponse response
        )
        {
            statusLoaded = true;
            statusLoading = false;
            statusError = "";

            hasDecided = response.hasDecided;
            previousDecision =
                response.decision ?? "";

            if (hasDecided)
            {
                resultMessage =
                    previousDecision == "HELP"
                        ? "Maya remembers that you agreed to help."
                        : "Maya remembers that you refused.";

                Debug.Log(
                    "Maya remembered decision: " +
                    previousDecision
                );
            }
            else
            {
                resultMessage = "";
            }
        }

        private void HandleStatusFailure(string error)
        {
            statusLoaded = false;
            statusLoading = false;

            nextRetryTime =
                Time.unscaledTime + RetryDelaySeconds;

            statusError =
                "Unable to check Maya's memory.";

            Debug.LogWarning(
                "Maya decision-status request failed: " +
                error
            );
        }

        private void SubmitDecision(string decision)
        {
            if (
                npcApiClient == null ||
                !interactionOpen ||
                !statusLoaded ||
                hasDecided ||
                decisionInProgress
            )
            {
                return;
            }

            if (
                decision != "HELP" &&
                decision != "REFUSE"
            )
            {
                return;
            }

            decisionInProgress = true;

            resultMessage =
                "Maya is considering your response...";

            string requestPlayerId = loadedPlayerId;

            decisionCoroutine = StartCoroutine(
                SubmitDecisionRequest(
                    decision,
                    requestPlayerId
                )
            );
        }

        private IEnumerator SubmitDecisionRequest(
            string decision,
            string requestPlayerId
        )
        {
            MayaInteractionResponse response = null;
            string error = null;

            yield return npcApiClient.RecordMayaHelpDecision(
                decision,
                value => response = value,
                failure => error = failure
            );

            decisionCoroutine = null;

            if (requestPlayerId != loadedPlayerId)
            {
                yield break;
            }

            decisionInProgress = false;

            if (!string.IsNullOrEmpty(error))
            {
                HandleDecisionFailure(error);
                yield break;
            }

            if (response == null)
            {
                HandleDecisionFailure(
                    "Empty interaction response."
                );

                yield break;
            }

            HandleDecisionSuccess(response);
        }

        private void HandleDecisionSuccess(
            MayaInteractionResponse response
        )
        {
            hasDecided = true;
            statusLoaded = true;

            previousDecision = response.decision;
            resultMessage = response.message;

            Debug.Log(
                $"Maya decision recorded: " +
                $"{response.decision} | " +
                $"Trust {response.relationship.trust} | " +
                $"Respect {response.relationship.respect} | " +
                $"Resentment {response.relationship.resentment}"
            );

            Debug.Log(
                "Maya memory created: " +
                response.memory.summary
            );
        }

        private void HandleDecisionFailure(string error)
        {
            Debug.LogWarning(
                "Maya interaction failed: " + error
            );

            // The server might have committed the decision
            // even if the response was lost.
            // Never blindly resubmit a failed decision.

            statusLoaded = false;
            statusLoading = false;

            resultMessage =
                "Checking whether your decision was saved...";

            nextRetryTime =
                Time.unscaledTime + RetryDelaySeconds;
        }

        private void ResetInteractionState()
        {
            if (statusCoroutine != null)
            {
                StopCoroutine(statusCoroutine);
                statusCoroutine = null;
            }

            // A submitted decision may already be processing
            // on the server. Stopping the local coroutine
            // does not cancel the server transaction.
            if (decisionCoroutine != null)
            {
                StopCoroutine(decisionCoroutine);
                decisionCoroutine = null;
            }

            statusLoaded = false;
            statusLoading = false;
            hasDecided = false;
            decisionInProgress = false;

            previousDecision = "";
            resultMessage = "";
            statusError = "";

            loadedPlayerId = "";

            nextRetryTime = 0f;
        }

        private void OnGUI()
        {
            if (!interactionOpen)
            {
                return;
            }

            float centerX =
                Screen.width / 2f;

            float panelY =
                Mathf.Max(
                    10f,
                    Screen.height - 270f
                );

            float panelX =
                centerX - 220f;

            GUI.Box(
                new Rect(
                    panelX,
                    panelY,
                    440f,
                    240f
                ),
                "Maya — Restaurant Owner"
            );

            if (!statusLoaded)
            {
                string loadingMessage =
                    statusLoading
                        ? "Checking Maya's memory..."
                        : "Waiting for Maya's memory...";

                GUI.Label(
                    new Rect(
                        panelX + 25f,
                        panelY + 50f,
                        390f,
                        55f
                    ),
                    loadingMessage
                );

                if (!string.IsNullOrEmpty(statusError))
                {
                    GUI.Label(
                        new Rect(
                            panelX + 25f,
                            panelY + 110f,
                            390f,
                            40f
                        ),
                        statusError
                    );

                    if (
                        !statusLoading &&
                        GUI.Button(
                            new Rect(
                                panelX + 120f,
                                panelY + 170f,
                                200f,
                                40f
                            ),
                            "Retry"
                        )
                    )
                    {
                        nextRetryTime = 0f;
                        RequestDecisionStatus();
                    }
                }

                return;
            }

            if (hasDecided)
            {
                string dialogue =
                    previousDecision == "HELP"
                        ? "You agreed to help me when my supplies were stolen.\nI haven't forgotten that."
                        : "When I needed help, you refused.\nI remember what happened.";

                GUI.Label(
                    new Rect(
                        panelX + 25f,
                        panelY + 55f,
                        390f,
                        90f
                    ),
                    dialogue
                );

                GUI.Label(
                    new Rect(
                        panelX + 25f,
                        panelY + 160f,
                        390f,
                        40f
                    ),
                    "Your decision is part of Maya's memory."
                );

                return;
            }

            GUI.Label(
                new Rect(
                    panelX + 25f,
                    panelY + 45f,
                    390f,
                    65f
                ),
                "Someone stole supplies from my restaurant.\n" +
                "Will you help me?"
            );

            GUI.enabled = !decisionInProgress;

            if (
                GUI.Button(
                    new Rect(
                        panelX + 25f,
                        panelY + 120f,
                        185f,
                        45f
                    ),
                    decisionInProgress
                        ? "Please wait..."
                        : "Help Maya"
                )
            )
            {
                SubmitDecision("HELP");
            }

            if (
                GUI.Button(
                    new Rect(
                        panelX + 230f,
                        panelY + 120f,
                        185f,
                        45f
                    ),
                    decisionInProgress
                        ? "Please wait..."
                        : "Refuse"
                )
            )
            {
                SubmitDecision("REFUSE");
            }

            GUI.enabled = true;

            if (!string.IsNullOrEmpty(resultMessage))
            {
                GUI.Label(
                    new Rect(
                        panelX + 25f,
                        panelY + 185f,
                        390f,
                        35f
                    ),
                    resultMessage
                );
            }
        }

        private void OnDisable()
        {
            interactionOpen = false;
            ResetInteractionState();
        }
    }
}
