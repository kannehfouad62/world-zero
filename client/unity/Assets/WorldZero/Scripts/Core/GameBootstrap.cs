using UnityEngine;

namespace WorldZero.Core
{
    public sealed class GameBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            Debug.Log("WORLD ZERO — The Living World");
            Debug.Log("Client bootstrap initialized.");
        }
    }
}
