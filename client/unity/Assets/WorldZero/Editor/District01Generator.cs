using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using WorldZero.Core;
using WorldZero.Player;

namespace WorldZero.EditorTools
{
    public static class District01Generator
    {
        private const string ScenePath =
            "Assets/WorldZero/Scenes/District01_Prototype.unity";

        [MenuItem("WORLD ZERO/Generate District 01 Prototype")]
        public static void Generate()
        {
            Scene scene = EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene,
                NewSceneMode.Single
            );

            GameObject systems = new GameObject("WORLD ZERO Systems");
            systems.AddComponent<GameBootstrap>();

            CreateLighting();
            CreateEnvironment();

            GameObject player = CreatePlayer();
            CreateCamera(player.transform);

            EditorSceneManager.SaveScene(scene, ScenePath);

            Selection.activeGameObject = player;

            Debug.Log(
                $"WORLD ZERO District 01 generated successfully: {ScenePath}"
            );
        }

        private static void CreateLighting()
        {
            GameObject sun = new GameObject("Sun");
            Light light = sun.AddComponent<Light>();

            light.type = LightType.Directional;
            light.intensity = 1.2f;

            sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            RenderSettings.sun = light;
        }

        private static void CreateEnvironment()
        {
            GameObject environment = new GameObject("Environment");

            CreateCube(
                "Ground",
                environment.transform,
                new Vector3(0f, -0.5f, 0f),
                new Vector3(140f, 1f, 140f),
                new Color(0.22f, 0.28f, 0.22f)
            );

            GameObject roads = new GameObject("Roads");
            roads.transform.SetParent(environment.transform);

            CreateCube(
                "Main Road East-West",
                roads.transform,
                new Vector3(0f, 0.02f, 0f),
                new Vector3(140f, 0.1f, 14f),
                new Color(0.12f, 0.12f, 0.13f)
            );

            CreateCube(
                "Main Road North-South",
                roads.transform,
                new Vector3(0f, 0.03f, 0f),
                new Vector3(14f, 0.1f, 140f),
                new Color(0.12f, 0.12f, 0.13f)
            );

            GameObject buildings = new GameObject("Buildings");
            buildings.transform.SetParent(environment.transform);

            CreateBuilding(
                "Maya's Restaurant",
                buildings.transform,
                new Vector3(-27f, 3f, 23f),
                new Vector3(20f, 6f, 16f),
                new Color(0.72f, 0.35f, 0.24f)
            );

            CreateBuilding(
                "Convenience Store",
                buildings.transform,
                new Vector3(25f, 2.5f, 24f),
                new Vector3(16f, 5f, 14f),
                new Color(0.25f, 0.55f, 0.72f)
            );

            CreateBuilding(
                "Apartment Building",
                buildings.transform,
                new Vector3(-48f, 8f, 42f),
                new Vector3(22f, 16f, 20f),
                new Color(0.48f, 0.49f, 0.55f)
            );

            CreateBuilding(
                "Bank",
                buildings.transform,
                new Vector3(-30f, 4f, -26f),
                new Vector3(20f, 8f, 18f),
                new Color(0.65f, 0.65f, 0.58f)
            );

            CreateBuilding(
                "Police Station",
                buildings.transform,
                new Vector3(29f, 4f, -27f),
                new Vector3(22f, 8f, 18f),
                new Color(0.24f, 0.35f, 0.55f)
            );

            CreateBuilding(
                "Hospital",
                buildings.transform,
                new Vector3(-48f, 6f, -49f),
                new Vector3(25f, 12f, 22f),
                new Color(0.82f, 0.84f, 0.86f)
            );

            CreateBuilding(
                "Office",
                buildings.transform,
                new Vector3(20f, 7f, -50f),
                new Vector3(22f, 14f, 20f),
                new Color(0.34f, 0.48f, 0.55f)
            );

            CreateBuilding(
                "Warehouse",
                buildings.transform,
                new Vector3(50f, 4f, 44f),
                new Vector3(28f, 8f, 24f),
                new Color(0.42f, 0.40f, 0.36f)
            );

            CreatePark(environment.transform);
        }

        private static void CreatePark(Transform parent)
        {
            GameObject park = new GameObject("Park");
            park.transform.SetParent(parent);

            CreateCube(
                "Park Ground",
                park.transform,
                new Vector3(30f, 0.05f, 49f),
                new Vector3(22f, 0.1f, 20f),
                new Color(0.20f, 0.48f, 0.22f)
            );

            CreateTree(
                park.transform,
                new Vector3(25f, 2f, 45f)
            );

            CreateTree(
                park.transform,
                new Vector3(34f, 2f, 45f)
            );

            CreateTree(
                park.transform,
                new Vector3(29f, 2f, 53f)
            );
        }

        private static void CreateTree(
            Transform parent,
            Vector3 position
        )
        {
            GameObject trunk = CreateCube(
                "Tree Trunk",
                parent,
                position,
                new Vector3(0.8f, 4f, 0.8f),
                new Color(0.30f, 0.18f, 0.08f)
            );

            GameObject crown = GameObject.CreatePrimitive(
                PrimitiveType.Sphere
            );

            crown.name = "Tree Crown";
            crown.transform.SetParent(trunk.transform);
            crown.transform.localPosition = new Vector3(0f, 1.3f, 0f);
            crown.transform.localScale = new Vector3(4f, 2.5f, 4f);

            ApplyMaterial(
                crown,
                new Color(0.12f, 0.40f, 0.16f)
            );
        }

        private static GameObject CreatePlayer()
        {
            GameObject player = GameObject.CreatePrimitive(
                PrimitiveType.Capsule
            );

            player.name = "Player";
            player.transform.position = new Vector3(0f, 1f, -10f);

            Collider primitiveCollider =
                player.GetComponent<Collider>();

            Object.DestroyImmediate(primitiveCollider);

            CharacterController controller =
                player.AddComponent<CharacterController>();

            controller.height = 2f;
            controller.radius = 0.5f;
            controller.center = Vector3.zero;

            player.AddComponent<PlayerMovement>();

            ApplyMaterial(
                player,
                new Color(0.15f, 0.55f, 0.95f)
            );

            return player;
        }

        private static void CreateCamera(Transform target)
        {
            GameObject cameraObject = new GameObject("Main Camera");

            Camera camera = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";

            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 500f;

            cameraObject.transform.position =
                target.position + new Vector3(0f, 7f, -9f);

            ThirdPersonCamera cameraController =
                cameraObject.AddComponent<ThirdPersonCamera>();

            cameraController.SetTarget(target);
        }

        private static void CreateBuilding(
            string name,
            Transform parent,
            Vector3 position,
            Vector3 scale,
            Color color
        )
        {
            GameObject building = CreateCube(
                name,
                parent,
                position,
                scale,
                color
            );

            GameObject sign = new GameObject($"{name} Sign");
            sign.transform.SetParent(building.transform);
            sign.transform.localPosition = new Vector3(
                0f,
                0.6f,
                -0.51f
            );

            TextMesh text = sign.AddComponent<TextMesh>();
            text.text = name;
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.15f;
            text.fontSize = 40;

            sign.transform.localScale = new Vector3(
                1f / scale.x,
                1f / scale.y,
                1f / scale.z
            );
        }

        private static GameObject CreateCube(
            string name,
            Transform parent,
            Vector3 position,
            Vector3 scale,
            Color color
        )
        {
            GameObject cube = GameObject.CreatePrimitive(
                PrimitiveType.Cube
            );

            cube.name = name;
            cube.transform.SetParent(parent);
            cube.transform.position = position;
            cube.transform.localScale = scale;

            ApplyMaterial(cube, color);

            return cube;
        }

        private static void ApplyMaterial(
            GameObject target,
            Color color
        )
        {
            Renderer renderer = target.GetComponent<Renderer>();

            Material material = new Material(
                Shader.Find("Universal Render Pipeline/Lit")
            );

            material.color = color;

            renderer.sharedMaterial = material;
        }
    }
}
