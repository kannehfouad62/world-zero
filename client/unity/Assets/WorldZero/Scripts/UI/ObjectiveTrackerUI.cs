using System;
using System.Collections;
using UnityEngine;
using WorldZero.Networking;

namespace WorldZero.UI
{
    public sealed class ObjectiveTrackerUI : MonoBehaviour
    {
        [SerializeField]
        private ObjectiveApiClient objectiveApiClient;

        [SerializeField]
        private float refreshIntervalSeconds = 15f;

        private PlayerObjectivesResponse response;
        private string errorMessage = "";

        private bool loading;
        private float nextRefreshTime;

        private void Awake()
        {
            if (objectiveApiClient == null)
            {
                objectiveApiClient =
                    GetComponent<ObjectiveApiClient>();
            }
        }

        private void Update()
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                response = null;
                return;
            }

            if (!loading && Time.unscaledTime >= nextRefreshTime)
            {
                StartCoroutine(RefreshObjectives());
            }
        }

        private IEnumerator RefreshObjectives()
        {
            if (objectiveApiClient == null)
            {
                errorMessage = "Objective API client is missing.";
                nextRefreshTime = Time.unscaledTime + 5f;
                yield break;
            }

            loading = true;

            PlayerObjectivesResponse loaded = null;
            string failure = null;

            yield return objectiveApiClient.GetObjectives(
                value => loaded = value,
                error => failure = error
            );

            loading = false;

            nextRefreshTime =
                Time.unscaledTime + Mathf.Max(5f, refreshIntervalSeconds);

            if (!string.IsNullOrEmpty(failure))
            {
                errorMessage = failure;
                Debug.LogWarning(failure);
                yield break;
            }

            response = loaded;
            errorMessage = "";
        }

        private void OnGUI()
        {
            SessionManager session = SessionManager.Instance;

            if (session == null || !session.IsAuthenticated)
            {
                return;
            }

            if (response == null || response.objectives == null)
            {
                return;
            }

            if (response.objectives.Length == 0)
            {
                return;
            }

            PlayerObjectiveResponse objective =
                response.objectives[0];

            float width = Mathf.Min(390f, Screen.width - 20f);

            Rect panel = new Rect(
                Screen.width - width - 10f,
                10f,
                width,
                135f
            );

            GUI.Box(panel, "ACTIVE OBJECTIVE");

            GUI.Label(
                new Rect(panel.x + 15f, panel.y + 30f, width - 30f, 25f),
                objective.title
            );

            GUI.Label(
                new Rect(panel.x + 15f, panel.y + 60f, width - 30f, 45f),
                objective.currentObjective ?? ""
            );

            GUI.Label(
                new Rect(panel.x + 15f, panel.y + 110f, width - 30f, 20f),
                $"Progress: {objective.currentStep}/{objective.totalSteps}"
            );
        }
    }
}
