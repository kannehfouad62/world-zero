using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.UI
{
    public sealed class MayaInteractionUI : MonoBehaviour
    {
        private const float InteractionDistance = 5f;

        [SerializeField]
        private Transform player;

        [SerializeField]
        private NpcApiClient npcApiClient;

        private Transform maya;

        private bool interactionOpen;
        private bool decisionSubmitted;

        private string resultMessage = "";

        private void Update()
        {
            if (player == null)
            {
                return;
            }

            if (maya == null)
            {
                GameObject mayaObject =
                    GameObject.Find("NPC — Maya");

                if (mayaObject != null)
                {
                    maya = mayaObject.transform;
                }

                return;
            }

            float distance = Vector3.Distance(
                player.position,
                maya.position
            );

            if (
                distance <= InteractionDistance &&
                !decisionSubmitted
            )
            {
                interactionOpen = true;
            }
            else if (distance > InteractionDistance)
            {
                interactionOpen = false;
            }
        }

        private void OnGUI()
        {
            if (!interactionOpen)
            {
                return;
            }

            GUI.Box(
                new Rect(
                    Screen.width / 2f - 220f,
                    Screen.height - 250f,
                    440f,
                    210f
                ),
                "Maya — Restaurant Owner"
            );

            GUI.Label(
                new Rect(
                    Screen.width / 2f - 195f,
                    Screen.height - 215f,
                    390f,
                    60f
                ),
                "Someone stole supplies from my restaurant.\n" +
                "Will you help me?"
            );

            if (
                GUI.Button(
                    new Rect(
                        Screen.width / 2f - 190f,
                        Screen.height - 145f,
                        180f,
                        40f
                    ),
                    "Help Maya"
                )
            )
            {
                SubmitDecision("HELP");
            }

            if (
                GUI.Button(
                    new Rect(
                        Screen.width / 2f + 10f,
                        Screen.height - 145f,
                        180f,
                        40f
                    ),
                    "Refuse"
                )
            )
            {
                SubmitDecision("REFUSE");
            }

            if (!string.IsNullOrWhiteSpace(resultMessage))
            {
                GUI.Label(
                    new Rect(
                        Screen.width / 2f - 195f,
                        Screen.height - 95f,
                        390f,
                        40f
                    ),
                    resultMessage
                );
            }
        }

        private void SubmitDecision(string decision)
        {
            if (
                npcApiClient == null ||
                decisionSubmitted
            )
            {
                return;
            }

            decisionSubmitted = true;
            resultMessage = "Maya is considering your response...";

            StartCoroutine(
                npcApiClient.RecordMayaHelpDecision(
                    decision,
                    HandleSuccess,
                    HandleFailure
                )
            );
        }

        private void HandleSuccess(
            MayaInteractionResponse response
        )
        {
            resultMessage = response.message;

            Debug.Log(
                $"Maya decision recorded: {response.decision} | " +
                $"Trust {response.relationship.trust} | " +
                $"Respect {response.relationship.respect} | " +
                $"Resentment {response.relationship.resentment}"
            );

            Debug.Log(
                $"Maya memory created: " +
                $"{response.memory.summary}"
            );
        }

        private void HandleFailure(string error)
        {
            decisionSubmitted = false;
            resultMessage = "Interaction failed.";

            Debug.LogError(error);
        }
    }
}
