using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using WorldZero.Networking;

namespace WorldZero.Investigation
{
    public sealed class SupplyCrateInteraction : MonoBehaviour
    {
        private const string ItemSlug = "maya-stolen-supply-crate";
        private const float InteractionDistance = 3f;

        [SerializeField]
        private Transform player;

        [SerializeField]
        private Vector3 cratePosition = new Vector3(54f, 0f, 29f);

        private GameObject crate;
        private string playerId = "";
        private string message = "";

        private bool statusKnown;
        private bool loading;
        private bool recovering;
        private bool recovered;
        private bool canRecover;

        private float nextRefresh;
        private Coroutine requestCoroutine;

        [Serializable]
        private sealed class SupplyStatus
        {
            public bool available;
            public bool recovered;
            public string recoveredAt;
            public int currentStep;
            public bool canRecover;
        }

        [Serializable]
        private sealed class RecoveryProgress
        {
            public string status;
            public int previousStep;
            public int currentStep;
        }

        [Serializable]
        private sealed class RecoveryResult
        {
            public RecoveryProgress progress;
            public string message;
        }

        private void Awake()
        {
            FindPlayer();
            CreateCrate();
        }

        private void FindPlayer()
        {
            if (player != null) return;

            var controller =
                FindFirstObjectByType<
                    WorldZero.Player.PlayerSessionController>();

            if (controller != null)
                player = controller.transform;
        }

        private void CreateCrate()
        {
            crate = GameObject.CreatePrimitive(PrimitiveType.Cube);
            crate.name = "Maya - Stolen Supply Crate";
            crate.transform.position =
                cratePosition + Vector3.up * 0.35f;
            crate.transform.localScale =
                new Vector3(0.9f, 0.7f, 0.9f);

            Collider collider = crate.GetComponent<Collider>();
            if (collider != null) Destroy(collider);

            Renderer renderer = crate.GetComponent<Renderer>();
            Shader shader = Shader.Find(
                "Universal Render Pipeline/Lit");

            if (shader == null)
                shader = Shader.Find("Standard");

            if (shader != null && renderer != null)
            {
                Material material = new Material(shader);
                material.color = new Color(0.55f, 0.3f, 0.12f);
                renderer.material = material;
            }

            GameObject label = new GameObject("Supply Crate Label");
            label.transform.position =
                cratePosition + Vector3.up * 1.5f;
            label.transform.SetParent(crate.transform, true);

            TextMesh text = label.AddComponent<TextMesh>();
            text.text = "MAYA'S SUPPLIES";
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.12f;
            text.fontSize = 36;
        }

        private void Update()
        {
            if (player == null) FindPlayer();

            SessionManager session = SessionManager.Instance;

            if (session == null ||
                !session.IsAuthenticated ||
                session.Player == null)
            {
                if (playerId != "") ResetState();
                return;
            }

            if (playerId != session.Player.id)
            {
                ResetState();
                playerId = session.Player.id;
                RefreshStatus();
            }

            if (!statusKnown &&
                !loading &&
                !recovering &&
                requestCoroutine == null &&
                Time.unscaledTime >= nextRefresh)
            {
                RefreshStatus();
            }
        }

        private void RefreshStatus()
        {
            if (loading || recovering ||
                requestCoroutine != null ||
                playerId == "")
                return;

            loading = true;
            nextRefresh = Time.unscaledTime + 5f;
            requestCoroutine = StartCoroutine(
                GetStatus(playerId));
        }

        private IEnumerator GetStatus(string requestedPlayer)
        {
            SessionManager session = SessionManager.Instance;
            if (session == null || !session.IsAuthenticated)
            {
                loading = false;
                requestCoroutine = null;
                yield break;
            }

            using UnityWebRequest request = UnityWebRequest.Get(
                $"{ApiConfig.BaseUrl}/me/items/{ItemSlug}/status");

            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}");
            request.timeout = 15;

            yield return request.SendWebRequest();

            if (requestedPlayer != playerId) yield break;

            loading = false;
            requestCoroutine = null;

            if (request.result != UnityWebRequest.Result.Success)
            {
                statusKnown = false;
                message = "Unable to verify supply status.";
                Debug.LogWarning(
                    $"Supply status HTTP {request.responseCode}");
                yield break;
            }

            SupplyStatus status = null;
            try
            {
                status = JsonUtility.FromJson<SupplyStatus>(
                    request.downloadHandler.text);
            }
            catch (Exception error)
            {
                Debug.LogWarning(error.Message);
            }

            if (status == null)
            {
                statusKnown = false;
                message = "Invalid supply status.";
                yield break;
            }

            statusKnown = true;
            recovered = status.recovered;
            canRecover = status.canRecover;

            if (crate != null)
                crate.SetActive(status.available && !recovered);

            message = recovered
                ? "Supplies already recovered."
                : canRecover
                    ? ""
                    : "Supplies are not available at this step.";
        }

        private bool IsNearCrate()
        {
            return player != null &&
                Vector3.Distance(
                    player.position,
                    cratePosition + Vector3.up) <=
                InteractionDistance;
        }

        private void OnGUI()
        {
            SessionManager session = SessionManager.Instance;

            if (session == null ||
                !session.IsAuthenticated ||
                playerId == "" ||
                recovered ||
                !IsNearCrate())
                return;

            float width = Mathf.Min(400f, Screen.width - 20f);
            float x = (Screen.width - width) / 2f;
            float y = Mathf.Max(10f, Screen.height - 185f);

            GUI.Box(
                new Rect(x, y, width, 165f),
                "MAYA'S STOLEN SUPPLIES");

            GUI.Label(
                new Rect(x + 15f, y + 35f, width - 30f, 35f),
                "A crate containing Maya's missing supplies.");

            if (loading || recovering || !statusKnown || !canRecover)
            {
                GUI.Label(
                    new Rect(x + 15f, y + 85f, width - 30f, 50f),
                    recovering ? "Recovering supplies..." :
                    loading ? "Checking supply status..." :
                    message);
                return;
            }

            if (GUI.Button(
                new Rect(x + 15f, y + 85f, width - 30f, 40f),
                "Recover Supplies"))
            {
                recovering = true;
                requestCoroutine = StartCoroutine(
                    RecoverSupplies(playerId));
            }
        }

        private IEnumerator RecoverSupplies(string requestedPlayer)
        {
            SessionManager session = SessionManager.Instance;
            if (session == null || !session.IsAuthenticated)
            {
                recovering = false;
                requestCoroutine = null;
                yield break;
            }

            using UnityWebRequest request = new UnityWebRequest(
                $"{ApiConfig.BaseUrl}/me/items/{ItemSlug}/recover",
                "POST");

            request.downloadHandler = new DownloadHandlerBuffer();
            request.uploadHandler = new UploadHandlerRaw(
                System.Text.Encoding.UTF8.GetBytes("{}"));

            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader(
                "Authorization",
                $"Bearer {session.AccessToken}");
            request.timeout = 15;

            yield return request.SendWebRequest();

            if (requestedPlayer != playerId) yield break;

            recovering = false;
            requestCoroutine = null;

            if (request.result == UnityWebRequest.Result.Success)
            {
                RecoveryResult result = null;
                try
                {
                    result = JsonUtility.FromJson<RecoveryResult>(
                        request.downloadHandler.text);
                }
                catch (Exception error)
                {
                    Debug.LogWarning(error.Message);
                }

                if (result != null &&
                    result.progress != null &&
                    result.progress.currentStep == 3)
                {
                    recovered = true;
                    canRecover = false;
                    statusKnown = true;

                    if (crate != null) crate.SetActive(false);

                    Debug.Log(
                        "WORLD ZERO: Maya's supplies recovered. " +
                        "Investigation advanced to 3/4.");
                    yield break;
                }
            }

            // Do not repeat an uncertain POST.
            // Reconcile using the read-only status endpoint.
            statusKnown = false;
            canRecover = false;
            message = "Verifying recovery with the server...";
            nextRefresh = 0f;

            Debug.LogWarning(
                $"Supply recovery outcome uncertain: HTTP {request.responseCode}");
        }

        private void ResetState()
        {
            if (requestCoroutine != null)
            {
                StopCoroutine(requestCoroutine);
                requestCoroutine = null;
            }

            playerId = "";
            message = "";
            statusKnown = false;
            loading = false;
            recovering = false;
            recovered = false;
            canRecover = false;
            nextRefresh = 0f;

            if (crate != null) crate.SetActive(false);
        }

        private void OnDisable()
        {
            ResetState();
        }

        private void OnDestroy()
        {
            if (crate != null) Destroy(crate);
        }
    }
}
