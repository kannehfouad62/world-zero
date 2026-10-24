using System;
using System.Collections;
using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.UI
{
    public sealed class MayaInteractionUI : MonoBehaviour
    {
        private const float InteractionDistance = 5f;
        private const float RetryDelaySeconds = 5f;
        private const float NpcSearchInterval = 1f;

        [Header("Scene References")]
        [SerializeField] private Transform player;
        [SerializeField] private NpcApiClient npcApiClient;
        [SerializeField] private MayaDeliveryApiClient deliveryApiClient;

        [Header("Diagnostics")]
        [SerializeField] private bool enableDebugLogging = true;

        private Transform maya;
        private string loadedPlayerId = "";
        private string previousDecision = "";
        private string resultMessage = "";
        private string statusError = "";

        private bool interactionOpen;
        private bool statusLoaded;
        private bool statusLoading;
        private bool hasDecided;
        private bool decisionInProgress;

        private bool deliveryStatusLoaded;
        private bool deliveryStatusLoading;
        private bool deliveryInProgress;
        private bool deliveryOutcomeUncertain;
        private bool canDeliver;
        private bool missionCompleted;
        private bool hasRecoveredSupplies;

        private int currentStep;
        private float nextRetryTime;
        private float nextDeliveryRetryTime;
        private float nextNpcSearchTime;
        private float nextDebugTime;

        private Coroutine statusCoroutine;
        private Coroutine decisionCoroutine;
        private Coroutine deliveryStatusCoroutine;
        private Coroutine deliveryCoroutine;

        private void Awake()
        {
            FindReferences();
        }

        private void FindReferences()
        {
            if (npcApiClient == null)
                npcApiClient = FindFirstObjectByType<NpcApiClient>();

            if (deliveryApiClient == null)
                deliveryApiClient =
                    FindFirstObjectByType<MayaDeliveryApiClient>();

            if (player == null)
            {
                var controller =
                    FindFirstObjectByType<
                        WorldZero.Player.PlayerSessionController>();

                if (controller != null)
                    player = controller.transform;
            }
        }

        private void OnEnable()
        {
            nextNpcSearchTime = 0f;
            nextRetryTime = 0f;
            nextDeliveryRetryTime = 0f;
        }

        private void Update()
        {
            SessionManager session = SessionManager.Instance;

            if (session == null ||
                !session.IsAuthenticated ||
                session.Player == null)
            {
                if (loadedPlayerId != "")
                    ResetInteractionState();

                interactionOpen = false;
                return;
            }

            if (loadedPlayerId != session.Player.id)
            {
                ResetInteractionState();
                loadedPlayerId = session.Player.id;
            }

            if (player == null ||
                npcApiClient == null ||
                deliveryApiClient == null)
            {
                FindReferences();
            }

            if (maya == null)
                FindMaya();

            if (player == null || maya == null)
            {
                interactionOpen = false;
                return;
            }

            float distance =
                Vector3.Distance(player.position, maya.position);

            interactionOpen = distance <= InteractionDistance;

            if (!interactionOpen)
                return;

            if (!statusLoaded &&
                !statusLoading &&
                !decisionInProgress &&
                Time.unscaledTime >= nextRetryTime)
            {
                RequestDecisionStatus();
            }

            if (!deliveryStatusLoaded &&
                !deliveryStatusLoading &&
                !deliveryInProgress &&
                deliveryStatusCoroutine == null &&
                Time.unscaledTime >= nextDeliveryRetryTime)
            {
                RequestDeliveryStatus();
            }

            if (enableDebugLogging &&
                Time.unscaledTime >= nextDebugTime)
            {
                nextDebugTime = Time.unscaledTime + 5f;

                Debug.Log(
                    "MAYA UI | " +
                    $"Distance={distance:F2} | " +
                    $"Step={currentStep} | " +
                    $"CanDeliver={canDeliver} | " +
                    $"Completed={missionCompleted}"
                );
            }
        }

        private void FindMaya()
        {
            if (Time.unscaledTime < nextNpcSearchTime)
                return;

            nextNpcSearchTime =
                Time.unscaledTime + NpcSearchInterval;

            GameObject found = GameObject.Find("NPC — Maya");

            if (found != null)
                maya = found.transform;
        }

        private void RequestDecisionStatus()
        {
            if (npcApiClient == null ||
                statusLoaded ||
                statusLoading ||
                decisionInProgress ||
                loadedPlayerId == "")
                return;

            statusLoading = true;
            statusError = "";

            statusCoroutine =
                StartCoroutine(LoadDecisionStatus(loadedPlayerId));
        }

        private IEnumerator LoadDecisionStatus(string playerId)
        {
            MayaDecisionStatusResponse response = null;
            string error = null;

            yield return npcApiClient.GetMayaDecisionStatus(
                value => response = value,
                failure => error = failure
            );

            statusCoroutine = null;

            if (playerId != loadedPlayerId)
                yield break;

            statusLoading = false;

            if (!string.IsNullOrEmpty(error) || response == null)
            {
                statusLoaded = false;
                statusError = "Unable to check Maya's memory.";
                nextRetryTime =
                    Time.unscaledTime + RetryDelaySeconds;

                Debug.LogWarning(
                    "Maya decision status: " + error);
                yield break;
            }

            statusLoaded = true;
            hasDecided = response.hasDecided;
            previousDecision = response.decision ?? "";
            statusError = "";
        }

        private void RequestDeliveryStatus()
        {
            if (deliveryApiClient == null ||
                deliveryStatusLoading ||
                deliveryInProgress ||
                deliveryStatusCoroutine != null ||
                loadedPlayerId == "")
                return;

            deliveryStatusLoading = true;
            nextDeliveryRetryTime =
                Time.unscaledTime + RetryDelaySeconds;

            deliveryStatusCoroutine =
                StartCoroutine(LoadDeliveryStatus(loadedPlayerId));
        }

        private IEnumerator LoadDeliveryStatus(string playerId)
        {
            MayaDeliveryStatusResponse response = null;
            string error = null;

            yield return deliveryApiClient.GetDeliveryStatus(
                value => response = value,
                failure => error = failure
            );

            deliveryStatusCoroutine = null;

            if (playerId != loadedPlayerId)
                yield break;

            deliveryStatusLoading = false;

            if (!string.IsNullOrEmpty(error) || response == null)
            {
                deliveryStatusLoaded = false;
                canDeliver = false;
                nextDeliveryRetryTime =
                    Time.unscaledTime + RetryDelaySeconds;

                Debug.LogWarning(
                    "Maya delivery status: " + error);
                yield break;
            }

            deliveryStatusLoaded = true;
            deliveryOutcomeUncertain = false;

            currentStep = response.currentStep;
            hasRecoveredSupplies = response.hasRecoveredSupplies;
            canDeliver = response.canDeliver;
            missionCompleted = response.completed;

            if (missionCompleted)
            {
                canDeliver = false;
                resultMessage =
                    "Thank you for returning my supplies. " +
                    "You kept your promise!";
            }
        }

        private void SubmitDecision(string decision)
        {
            if (npcApiClient == null ||
                !interactionOpen ||
                !statusLoaded ||
                hasDecided ||
                decisionInProgress ||
                decisionCoroutine != null ||
                (decision != "HELP" && decision != "REFUSE"))
                return;

            decisionInProgress = true;
            resultMessage = "Maya is considering your response...";

            decisionCoroutine = StartCoroutine(
                SubmitDecisionRequest(decision, loadedPlayerId));
        }

        private IEnumerator SubmitDecisionRequest(
            string decision,
            string playerId)
        {
            MayaInteractionResponse response = null;
            string error = null;

            yield return npcApiClient.RecordMayaHelpDecision(
                decision,
                value => response = value,
                failure => error = failure
            );

            decisionCoroutine = null;

            if (playerId != loadedPlayerId)
                yield break;

            decisionInProgress = false;

            if (!string.IsNullOrEmpty(error) || response == null)
            {
                statusLoaded = false;
                resultMessage =
                    "Checking whether your decision was saved...";
                nextRetryTime =
                    Time.unscaledTime + RetryDelaySeconds;
                yield break;
            }

            hasDecided = true;
            statusLoaded = true;
            previousDecision = response.decision;
            resultMessage = response.message;

            deliveryStatusLoaded = false;
            nextDeliveryRetryTime = 0f;

            Debug.Log(
                "Maya decision recorded: " + response.decision);
        }

        private void StartDelivery()
        {
            if (!interactionOpen ||
                !statusLoaded ||
                !hasDecided ||
                previousDecision != "HELP" ||
                !deliveryStatusLoaded ||
                !canDeliver ||
                missionCompleted ||
                deliveryInProgress ||
                deliveryOutcomeUncertain ||
                deliveryCoroutine != null ||
                deliveryApiClient == null)
                return;

            deliveryInProgress = true;
            canDeliver = false;
            resultMessage = "Returning Maya's supplies...";

            deliveryCoroutine =
                StartCoroutine(SubmitDelivery(loadedPlayerId));
        }

        private IEnumerator SubmitDelivery(string playerId)
        {
            MayaDeliveryResponse response = null;
            string error = null;

            yield return deliveryApiClient.DeliverSupplies(
                value => response = value,
                failure => error = failure
            );

            deliveryCoroutine = null;

            if (playerId != loadedPlayerId)
                yield break;

            deliveryInProgress = false;

            if (string.IsNullOrEmpty(error) &&
                response != null &&
                response.status == "COMPLETED" &&
                response.currentStep == 4)
            {
                missionCompleted = true;
                deliveryStatusLoaded = true;
                deliveryOutcomeUncertain = false;
                canDeliver = false;
                currentStep = 4;
                resultMessage = response.message;

                Debug.Log(
                    "WORLD ZERO: Maya mission completed. " +
                    "Progress 4/4.");

                Debug.Log(
                    "Maya completion memory: " +
                    response.memory.summary);

                yield break;
            }

            // The POST may have succeeded despite a lost response.
            // Never automatically repeat the delivery request.
            deliveryOutcomeUncertain = true;
            deliveryStatusLoaded = false;
            canDeliver = false;
            resultMessage =
                "Checking whether Maya received the supplies...";

            nextDeliveryRetryTime = 0f;

            Debug.LogWarning(
                "Maya delivery outcome uncertain: " + error);

            RequestDeliveryStatus();
        }

        private void OnGUI()
        {
            if (!interactionOpen)
                return;

            float width = Mathf.Min(440f, Screen.width - 20f);
            float x = (Screen.width - width) / 2f;
            float y = Mathf.Max(10f, Screen.height - 270f);

            GUI.Box(
                new Rect(x, y, width, 240f),
                "Maya — Restaurant Owner");

            if (!statusLoaded || !deliveryStatusLoaded)
            {
                string waiting =
                    statusLoading || deliveryStatusLoading
                        ? "Checking Maya's memory and investigation..."
                        : "Unable to verify Maya's current state.";

                GUI.Label(
                    new Rect(x + 20f, y + 55f, width - 40f, 65f),
                    waiting);

                if (!string.IsNullOrEmpty(statusError))
                    GUI.Label(
                        new Rect(x + 20f, y + 115f, width - 40f, 30f),
                        statusError);

                if (!statusLoading &&
                    !deliveryStatusLoading &&
                    !deliveryInProgress &&
                    GUI.Button(
                        new Rect(x + 90f, y + 170f, width - 180f, 40f),
                        "Check Server Status"))
                {
                    nextRetryTime = 0f;
                    nextDeliveryRetryTime = 0f;
                    RequestDecisionStatus();
                    RequestDeliveryStatus();
                }

                return;
            }

            if (missionCompleted)
            {
                GUI.Label(
                    new Rect(x + 20f, y + 50f, width - 40f, 90f),
                    "Thank you for bringing my supplies back!\n" +
                    "You kept your promise. I won't forget it.");

                GUI.Label(
                    new Rect(x + 20f, y + 165f, width - 40f, 45f),
                    "MISSION COMPLETED — Progress: 4/4");
                return;
            }

            if (hasDecided)
            {
                if (previousDecision == "REFUSE")
                {
                    GUI.Label(
                        new Rect(x + 20f, y + 55f, width - 40f, 95f),
                        "When I needed help, you refused.\n" +
                        "I remember what happened.");
                    return;
                }

                if (deliveryInProgress)
                {
                    GUI.Label(
                        new Rect(x + 20f, y + 65f, width - 40f, 60f),
                        "Returning recovered supplies...");
                    return;
                }

                if (canDeliver && !deliveryOutcomeUncertain)
                {
                    GUI.Label(
                        new Rect(x + 20f, y + 45f, width - 40f, 70f),
                        "You found my missing supplies!\n" +
                        "Will you return them to me?");

                    if (GUI.Button(
                        new Rect(x + 60f, y + 140f, width - 120f, 45f),
                        "Return Recovered Supplies"))
                    {
                        StartDelivery();
                    }

                    return;
                }

                GUI.Label(
                    new Rect(x + 20f, y + 55f, width - 40f, 85f),
                    "You agreed to help me when my supplies\n" +
                    "were stolen. I haven't forgotten that.");

                GUI.Label(
                    new Rect(x + 20f, y + 160f, width - 40f, 55f),
                    deliveryOutcomeUncertain
                        ? "Verifying delivery with the server..."
                        : hasRecoveredSupplies
                            ? "Your investigation is being verified."
                            : "Please continue your investigation.");

                return;
            }

            GUI.Label(
                new Rect(x + 20f, y + 45f, width - 40f, 65f),
                "Someone stole supplies from my restaurant.\n" +
                "Will you help me?");

            GUI.enabled = !decisionInProgress;

            if (GUI.Button(
                new Rect(x + 20f, y + 125f, (width - 50f) / 2f, 45f),
                "Help Maya"))
            {
                SubmitDecision("HELP");
            }

            if (GUI.Button(
                new Rect(x + 30f + (width - 50f) / 2f,
                    y + 125f, (width - 50f) / 2f, 45f),
                "Refuse"))
            {
                SubmitDecision("REFUSE");
            }

            GUI.enabled = true;

            if (!string.IsNullOrEmpty(resultMessage))
                GUI.Label(
                    new Rect(x + 20f, y + 185f, width - 40f, 35f),
                    resultMessage);
        }

        private void ResetInteractionState()
        {
            if (statusCoroutine != null)
                StopCoroutine(statusCoroutine);

            if (decisionCoroutine != null)
                StopCoroutine(decisionCoroutine);

            if (deliveryStatusCoroutine != null)
                StopCoroutine(deliveryStatusCoroutine);

            if (deliveryCoroutine != null)
                StopCoroutine(deliveryCoroutine);

            statusCoroutine = null;
            decisionCoroutine = null;
            deliveryStatusCoroutine = null;
            deliveryCoroutine = null;

            loadedPlayerId = "";
            previousDecision = "";
            resultMessage = "";
            statusError = "";

            statusLoaded = false;
            statusLoading = false;
            hasDecided = false;
            decisionInProgress = false;

            deliveryStatusLoaded = false;
            deliveryStatusLoading = false;
            deliveryInProgress = false;
            deliveryOutcomeUncertain = false;
            canDeliver = false;
            missionCompleted = false;
            hasRecoveredSupplies = false;
            currentStep = 0;

            nextRetryTime = 0f;
            nextDeliveryRetryTime = 0f;
        }

        private void OnDisable()
        {
            interactionOpen = false;
            ResetInteractionState();
        }
    }
}
