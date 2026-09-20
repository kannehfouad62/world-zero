using UnityEngine;

namespace WorldZero.Player
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField]
        private Transform target;

        [SerializeField]
        private Vector3 offset = new Vector3(0f, 7f, -9f);

        [SerializeField]
        private float followSpeed = 8f;

        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            Vector3 desiredPosition = target.position + offset;

            transform.position = Vector3.Lerp(
                transform.position,
                desiredPosition,
                followSpeed * Time.deltaTime
            );

            Vector3 lookDirection = target.position - transform.position;

            if (lookDirection.sqrMagnitude > 0.001f)
            {
                transform.rotation = Quaternion.LookRotation(
                    lookDirection,
                    Vector3.up
                );
            }
        }
    }
}
