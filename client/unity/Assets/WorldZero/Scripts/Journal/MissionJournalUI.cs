using System;
using System.Collections;
using UnityEngine;
using UnityEngine.InputSystem;
using WorldZero.Networking;

namespace WorldZero.Journal
{
    public sealed class MissionJournalUI : MonoBehaviour
    {
        private enum JournalFilter
        {
            All,
            Active,
            Completed
        }

        [Header("Scene References")]
        [SerializeField]
        private MissionJournalApiClient journalApiClient;

        [Header("Journal Settings")]
        [SerializeField]
        private Key toggleKey = Key.J;

        [SerializeField]
        private bool showDebugLogs = true;

        private MissionJournalResponse journal;
        private MissionJournalEntry selectedMission;

        private JournalFilter currentFilter = JournalFilter.All;

        private string loadedPlayerId = "";
        private string errorMessage = "";

        private bool journalOpen;
        private bool loading;

        private float nextRetryTime;

        private Vector2 missionScroll;
        private Vector2 detailScroll;

        private Coroutine loadCoroutine;

        private void Awake()
        {
            FindApiClient();
        }

        private void FindApiClient()
        {
            if (journalApiClient == null)
            {
                journalApiClient =
                    FindFirstObjectByType<MissionJournalApiClient>();
            }
        }

        private void Update()
        {
            SessionManager session = SessionManager.Instance;

            bool authenticated =
                session != null &&
                session.IsAuthenticated &&
                session.Player != null;

            if (!authenticated)
            {
                if (journalOpen || loadedPlayerId != "")
                    ResetJournal();

                return;
            }

            string playerId = session.Player.id;

            if (loadedPlayerId != playerId)
            {
                ResetJournal();
                loadedPlayerId = playerId;
            }

            if (Keyboard.current == null)
                return;

            if (Keyboard.current[toggleKey].wasPressedThisFrame)
            {
                journalOpen = !journalOpen;

                if (journalOpen)
                {
                    if (showDebugLogs)
                        Debug.Log("WORLD ZERO: Mission Journal opened.");

                    RefreshJournal();
                }
            }
        }

        private void RefreshJournal()
        {
            if (loading || loadedPlayerId == "")
                return;

            if (journalApiClient == null)
                FindApiClient();

            if (journalApiClient == null)
            {
                errorMessage = "Mission Journal API is not configured.";
                return;
            }

            loading = true;
            errorMessage = "";

            loadCoroutine = StartCoroutine(
                LoadJournal(loadedPlayerId)
            );
        }

        private IEnumerator LoadJournal(string requestedPlayerId)
        {
            MissionJournalResponse response = null;
            string error = null;

            yield return journalApiClient.GetMissionJournal(
                value => response = value,
                failure => error = failure
            );

            loadCoroutine = null;

            if (requestedPlayerId != loadedPlayerId)
                yield break;

            loading = false;

            if (!string.IsNullOrEmpty(error) || response == null)
            {
                errorMessage = string.IsNullOrEmpty(error)
                    ? "Unable to load mission journal."
                    : error;

                nextRetryTime = Time.unscaledTime + 5f;

                Debug.LogWarning(
                    "WORLD ZERO Mission Journal: " + errorMessage);

                yield break;
            }

            journal = response;
            errorMessage = "";

            if (selectedMission != null)
            {
                string selectedId = selectedMission.id;
                selectedMission = null;

                foreach (MissionJournalEntry mission in journal.missions)
                {
                    if (mission.id == selectedId)
                    {
                        selectedMission = mission;
                        break;
                    }
                }
            }

            if (selectedMission == null && journal.missions.Length > 0)
                selectedMission = journal.missions[0];

            if (showDebugLogs)
            {
                Debug.Log(
                    "WORLD ZERO: Mission Journal loaded " +
                    journal.missions.Length + " missions.");
            }
        }

        private void OnGUI()
        {
            if (!journalOpen)
                return;

            float width = Mathf.Min(900f, Screen.width - 30f);
            float height = Mathf.Min(610f, Screen.height - 30f);

            float x = (Screen.width - width) / 2f;
            float y = (Screen.height - height) / 2f;

            GUI.Box(
                new Rect(x, y, width, height),
                "WORLD ZERO — MISSION JOURNAL"
            );

            if (GUI.Button(
                new Rect(x + width - 45f, y + 10f, 30f, 25f),
                "X"))
            {
                journalOpen = false;
                return;
            }

            DrawFilters(x, y, width);

            if (GUI.Button(
                new Rect(x + width - 115f, y + 48f, 95f, 30f),
                loading ? "Loading..." : "Refresh"))
            {
                if (!loading && Time.unscaledTime >= nextRetryTime)
                    RefreshJournal();
            }

            if (loading && journal == null)
            {
                GUI.Label(
                    new Rect(x + 25f, y + 100f, width - 50f, 40f),
                    "Loading mission history...");
                return;
            }

            if (!string.IsNullOrEmpty(errorMessage))
            {
                GUI.Label(
                    new Rect(x + 25f, y + 95f, width - 50f, 55f),
                    errorMessage);
            }

            if (journal == null)
                return;

            float contentY = y + 145f;
            float contentHeight = height - 170f;
            float listWidth = width * 0.35f;

            DrawMissionList(
                new Rect(
                    x + 15f,
                    contentY,
                    listWidth,
                    contentHeight
                )
            );

            DrawMissionDetails(
                new Rect(
                    x + listWidth + 25f,
                    contentY,
                    width - listWidth - 40f,
                    contentHeight
                )
            );
        }

        private void DrawFilters(float x, float y, float width)
        {
            float buttonWidth = 110f;

            if (GUI.Button(
                new Rect(x + 20f, y + 50f, buttonWidth, 30f),
                "All"))
            {
                SetFilter(JournalFilter.All);
            }

            if (GUI.Button(
                new Rect(x + 140f, y + 50f, buttonWidth, 30f),
                "Active"))
            {
                SetFilter(JournalFilter.Active);
            }

            if (GUI.Button(
                new Rect(x + 260f, y + 50f, buttonWidth, 30f),
                "Completed"))
            {
                SetFilter(JournalFilter.Completed);
            }

            GUI.Label(
                new Rect(x + 20f, y + 92f, width - 40f, 30f),
                "Filter: " + currentFilter
            );
        }

        private void SetFilter(JournalFilter filter)
        {
            currentFilter = filter;
            missionScroll = Vector2.zero;
        }

        private void DrawMissionList(Rect area)
        {
            GUI.Box(area, "MISSIONS");

            GUILayout.BeginArea(
                new Rect(
                    area.x + 10f,
                    area.y + 30f,
                    area.width - 20f,
                    area.height - 40f
                )
            );

            missionScroll = GUILayout.BeginScrollView(missionScroll);

            int visibleCount = 0;

            foreach (MissionJournalEntry mission in journal.missions)
            {
                if (!MatchesFilter(mission))
                    continue;

                visibleCount++;

                string label =
                    mission.title + "\n" +
                    mission.status + " — " +
                    mission.currentStep + "/" +
                    (mission.totalSteps > 0
                        ? mission.totalSteps.ToString()
                        : "?");

                if (GUILayout.Button(
                    label,
                    GUILayout.Height(65f)))
                {
                    selectedMission = mission;
                    detailScroll = Vector2.zero;
                }
            }

            if (visibleCount == 0)
                GUILayout.Label("No missions in this category.");

            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private bool MatchesFilter(MissionJournalEntry mission)
        {
            if (currentFilter == JournalFilter.All)
                return true;

            if (currentFilter == JournalFilter.Active)
                return mission.status == "ACTIVE";

            return mission.status == "COMPLETED";
        }

        private void DrawMissionDetails(Rect area)
        {
            GUI.Box(area, "MISSION DETAILS");

            if (selectedMission == null ||
                !MatchesFilter(selectedMission))
            {
                GUI.Label(
                    new Rect(
                        area.x + 15f,
                        area.y + 45f,
                        area.width - 30f,
                        50f
                    ),
                    "Select a mission to view its history.");
                return;
            }

            GUILayout.BeginArea(
                new Rect(
                    area.x + 15f,
                    area.y + 35f,
                    area.width - 30f,
                    area.height - 50f
                )
            );

            detailScroll = GUILayout.BeginScrollView(detailScroll);

            DrawHeading(selectedMission.title);
            GUILayout.Label(selectedMission.description ?? "");

            GUILayout.Space(12f);

            DrawLine("Status", selectedMission.status);
            DrawLine(
                "Progress",
                selectedMission.currentStep + "/" +
                (selectedMission.totalSteps > 0
                    ? selectedMission.totalSteps.ToString()
                    : "?")
            );
            DrawLine("Decision", selectedMission.decision);
            DrawLine("Started", FormatDate(selectedMission.startedAt));
            DrawLine(
                "Completed",
                FormatDate(selectedMission.completedAt)
            );

            GUILayout.Space(15f);

            DrawHeading("DISCOVERED EVIDENCE");

            if (selectedMission.evidence != null)
            {
                foreach (MissionEvidence evidence in selectedMission.evidence)
                {
                    GUILayout.Label(
                        "• " + evidence.title + "\n" +
                        "  " + FormatDate(evidence.discoveredAt)
                    );
                }
            }

            GUILayout.Space(15f);

            DrawHeading("RECOVERED ITEMS");

            if (selectedMission.recoveredItems != null)
            {
                foreach (
                    MissionRecoveredItem item in
                    selectedMission.recoveredItems)
                {
                    GUILayout.Label(
                        "• " + item.name + "\n" +
                        "  " + FormatDate(item.recoveredAt)
                    );
                }
            }

            GUILayout.Space(15f);

            DrawHeading("NPC RELATIONSHIP");

            if (selectedMission.npc != null)
                DrawLine("NPC", selectedMission.npc.name);

            if (selectedMission.relationship != null)
            {
                DrawLine(
                    "Trust",
                    selectedMission.relationship.trust.ToString());
                DrawLine(
                    "Familiarity",
                    selectedMission.relationship.familiarity.ToString());
                DrawLine(
                    "Respect",
                    selectedMission.relationship.respect.ToString());
                DrawLine(
                    "Resentment",
                    selectedMission.relationship.resentment.ToString());
            }

            GUILayout.Space(15f);

            DrawHeading("PERSISTENT NPC MEMORIES");

            if (selectedMission.memories != null)
            {
                foreach (MissionMemory memory in selectedMission.memories)
                {
                    GUILayout.Label(
                        "• " + memory.summary + "\n" +
                        "  Importance: " + memory.importance + "\n" +
                        "  " + FormatDate(memory.occurredAt)
                    );

                    GUILayout.Space(8f);
                }
            }

            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private static void DrawHeading(string heading)
        {
            GUILayout.Label("<b>" + heading + "</b>");
        }

        private static void DrawLine(string label, string value)
        {
            GUILayout.Label(
                label + ": " +
                (string.IsNullOrEmpty(value) ? "—" : value)
            );
        }

        private static string FormatDate(string isoDate)
        {
            if (string.IsNullOrEmpty(isoDate))
                return "—";

            if (DateTimeOffset.TryParse(
                isoDate,
                out DateTimeOffset parsed))
            {
                return parsed.ToLocalTime().ToString(
                    "MMM dd, yyyy h:mm tt");
            }

            return isoDate;
        }

        private void ResetJournal()
        {
            if (loadCoroutine != null)
            {
                StopCoroutine(loadCoroutine);
                loadCoroutine = null;
            }

            loadedPlayerId = "";
            journalOpen = false;
            loading = false;
            journal = null;
            selectedMission = null;
            errorMessage = "";
            currentFilter = JournalFilter.All;
            nextRetryTime = 0f;
            missionScroll = Vector2.zero;
            detailScroll = Vector2.zero;
        }

        private void OnDisable()
        {
            ResetJournal();
        }
    }
}
