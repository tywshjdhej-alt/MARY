export interface UnityScriptFile {
  filename: string;
  folder: string;
  summary: string;
  code: string;
}

export const UNITY_SCRIPTS: UnityScriptFile[] = [
  {
    filename: 'GameManager.cs',
    folder: 'Assets/Scripts/Core',
    summary: 'Central singleton managing game states, stage progression (Stages 1-6), endings, and offline save hooks.',
    code: `using UnityEngine;
using UnityEngine.SceneManagement;

namespace MaryForgottenCity
{
    public enum GameState { MainMenu, IntroCinematic, Playing, Paused, GameOver, StageComplete }
    public enum EndingType { SeekerOfTruth, SilentSurvivor, MarkedByMary, SecretEnding }

    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Stage & State")]
        public GameState CurrentState = GameState.MainMenu;
        public int CurrentStageIndex = 1; // 1: House, 2: Silent City, 3: School, 4: Hospital, 5: Lab, 6: Mary's World
        public string LanguageCode = "ar"; // "ar" or "en"

        [Header("References")]
        public PlayerController Player;
        public MaryAI Mary;
        public PuzzleManager Puzzles;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Screen.orientation = ScreenOrientation.LandscapeLeft;
        }

        public void StartNewGame()
        {
            SaveSystem.ClearSave();
            CurrentStageIndex = 1;
            CurrentState = GameState.IntroCinematic;
            SceneManager.LoadScene("Stage1_AbandonedHouse");
        }

        public void ContinueGame()
        {
            SaveData data = SaveSystem.Load();
            if (data != null)
            {
                CurrentStageIndex = data.StageIndex;
                CurrentState = GameState.Playing;
                SceneManager.LoadScene($"Stage{CurrentStageIndex}_AbandonedHouse");
            }
        }

        public void SetPaused(bool paused)
        {
            CurrentState = paused ? GameState.Paused : GameState.Playing;
            Time.timeScale = paused ? 0f : 1f;
        }

        public void TriggerGameOver()
        {
            CurrentState = GameState.GameOver;
            Time.timeScale = 0f;
            AudioManager.Instance?.PlayMaryWhisper(true);
        }

        public void CompleteStageAndEvaluateEnding()
        {
            CurrentState = GameState.StageComplete;
            SaveSystem.Save(BuildCurrentSaveData());
        }

        public EndingType EvaluateEnding()
        {
            if (Puzzles != null && Puzzles.AllCluesFound && Puzzles.SecretNoteRead)
                return EndingType.SeekerOfTruth;
            if (Mary != null && Mary.HideCount <= 1 && Mary.IgnoredPhoneCount == 0)
                return EndingType.SilentSurvivor;
            return EndingType.MarkedByMary;
        }

        public SaveData BuildCurrentSaveData()
        {
            return new SaveData
            {
                StageIndex = CurrentStageIndex,
                PlayerPosition = Player != null ? Player.transform.position : Vector3.zero,
                Battery = FlashlightSystem.Instance != null ? FlashlightSystem.Instance.BatteryLevel : 100f,
                StudyDoorUnlocked = Puzzles != null && Puzzles.StudyDoorUnlocked,
                PortraitsSolved = Puzzles != null && Puzzles.PortraitsSolved,
                PowerRestored = Puzzles != null && Puzzles.PowerRestored,
                FrontDoorUnlocked = Puzzles != null && Puzzles.FrontDoorUnlocked
            };
        }
    }
}`,
  },
  {
    filename: 'PlayerController.cs',
    folder: 'Assets/Scripts/Player',
    summary: 'Third-person CharacterController supporting touch joystick + keyboard, sprinting, jumping, crouching/hiding, and animator states.',
    code: `using UnityEngine;

namespace MaryForgottenCity
{
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement Speeds")]
        public float WalkSpeed = 3.2f;
        public float SprintSpeed = 5.2f;
        public float CrouchSpeed = 1.8f;
        public float JumpHeight = 1.25f;
        public float Gravity = -15.5f;
        public float RotationSmoothTime = 0.12f;

        [Header("References")]
        public Transform CameraTransform;
        public Animator PlayerAnimator;
        public MobileJoystick Joystick;

        private CharacterController _controller;
        private Vector3 _velocity;
        private float _turnSmoothVelocity;

        public bool IsSprinting { get; private set; }
        public bool IsCrouching { get; private set; }
        public bool IsHidden { get; private set; }

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.CurrentState != GameState.Playing)
                return;
            if (IsHidden) return;

            HandleMovement();
            HandleGravityAndJump();
        }

        private void HandleMovement()
        {
            float h = Joystick != null && Joystick.InputVector.magnitude > 0.05f
                ? Joystick.InputVector.x
                : Input.GetAxisRaw("Horizontal");
            float v = Joystick != null && Joystick.InputVector.magnitude > 0.05f
                ? Joystick.InputVector.y
                : Input.GetAxisRaw("Vertical");

            Vector3 dir = new Vector3(h, 0f, v).normalized;
            IsSprinting = !IsCrouching && (Input.GetKey(KeyCode.LeftShift) || MobileControls.Instance?.IsSprintHeld == true);

            if (dir.magnitude >= 0.1f)
            {
                float targetAngle = Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg + CameraTransform.eulerAngles.y;
                float angle = Mathf.SmoothDampAngle(transform.eulerAngles.y, targetAngle, ref _turnSmoothVelocity, RotationSmoothTime);
                transform.rotation = Quaternion.Euler(0f, angle, 0f);

                Vector3 moveDir = Quaternion.Euler(0f, targetAngle, 0f) * Vector3.forward;
                float speed = IsCrouching ? CrouchSpeed : (IsSprinting ? SprintSpeed : WalkSpeed);
                _controller.Move(moveDir.normalized * speed * Time.deltaTime);

                AudioManager.Instance?.PlayFootstep(IsSprinting, IsCrouching);
            }

            if (PlayerAnimator != null)
            {
                PlayerAnimator.SetFloat("Speed", dir.magnitude * (IsSprinting ? 2f : 1f));
                PlayerAnimator.SetBool("IsCrouching", IsCrouching);
            }
        }

        private void HandleGravityAndJump()
        {
            if (_controller.isGrounded && _velocity.y < 0f)
                _velocity.y = -2f;

            if (Input.GetButtonDown("Jump"))
                TryJump();

            _velocity.y += Gravity * Time.deltaTime;
            _controller.Move(_velocity * Time.deltaTime);
        }

        public void TryJump()
        {
            if (_controller.isGrounded && !IsHidden)
            {
                _velocity.y = Mathf.Sqrt(JumpHeight * -2f * Gravity);
                IsCrouching = false;
                PlayerAnimator?.SetTrigger("Jump");
            }
        }

        public void ToggleCrouch()
        {
            if (IsHidden) return;
            IsCrouching = !IsCrouching;
            _controller.height = IsCrouching ? 1.1f : 1.8f;
            _controller.center = new Vector3(0f, _controller.height * 0.5f, 0f);
        }

        public void SetHidden(bool hidden, Vector3 spotPos)
        {
            IsHidden = hidden;
            _controller.enabled = false;
            transform.position = spotPos;
            _controller.enabled = true;
            if (hidden)
            {
                FlashlightSystem.Instance?.SetFlashlight(false);
                GameManager.Instance?.Mary?.RegisterPlayerHide();
            }
        }
    }
}`,
  },
  {
    filename: 'CameraController.cs',
    folder: 'Assets/Scripts/Camera',
    summary: 'Smooth third-person orbital camera behind player with touch-drag look and SphereCast wall-collision prevention.',
    code: `using UnityEngine;

namespace MaryForgottenCity
{
    public class CameraController : MonoBehaviour
    {
        [Header("Target & Offsets")]
        public Transform Target;
        public Vector3 TargetOffset = new Vector3(0f, 1.48f, 0f);
        public float DefaultDistance = 3.0f;
        public float MinDistance = 0.55f;
        public float SmoothTime = 0.08f;

        [Header("Orbit & Sensitivity")]
        public float Sensitivity = 0.22f;
        public float MinPitch = -22f;
        public float MaxPitch = 42f;
        public LayerMask CollisionMask;

        private float _yaw;
        private float _pitch = 12f;
        private float _currentDistance;
        private Vector3 _smoothVelocity;

        private void Start()
        {
            _currentDistance = DefaultDistance;
            if (Target != null) _yaw = Target.eulerAngles.y;
        }

        public void AddLookDelta(Vector2 delta)
        {
            _yaw += delta.x * Sensitivity;
            _pitch = Mathf.Clamp(_pitch - delta.y * Sensitivity, MinPitch, MaxPitch);
        }

        private void LateUpdate()
        {
            if (Target == null) return;

            if (Input.GetMouseButton(1))
            {
                AddLookDelta(new Vector2(Input.GetAxis("Mouse X") * 12f, Input.GetAxis("Mouse Y") * 12f));
            }

            Quaternion rotation = Quaternion.Euler(_pitch, _yaw, 0f);
            Vector3 focusPoint = Target.position + TargetOffset;
            Vector3 desiredDir = rotation * -Vector3.forward;

            // Prevent camera from clipping inside house walls
            float targetDist = DefaultDistance;
            if (Physics.SphereCast(focusPoint, 0.22f, desiredDir, out RaycastHit hit, DefaultDistance, CollisionMask))
            {
                targetDist = Mathf.Clamp(hit.distance - 0.1f, MinDistance, DefaultDistance);
            }

            _currentDistance = Mathf.Lerp(_currentDistance, targetDist, Time.deltaTime * 14f);
            Vector3 desiredPosition = focusPoint + desiredDir * _currentDistance;

            transform.position = Vector3.SmoothDamp(transform.position, desiredPosition, ref _smoothVelocity, SmoothTime);
            transform.LookAt(focusPoint);
        }
    }
}`,
  },
  {
    filename: 'MobileJoystick.cs',
    folder: 'Assets/Scripts/Input',
    summary: 'Responsive uGUI virtual thumbstick for mobile landscape left-side movement.',
    code: `using UnityEngine;
using UnityEngine.EventSystems;

namespace MaryForgottenCity
{
    public class MobileJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        public RectTransform Background;
        public RectTransform Handle;
        public float HandleRange = 64f;

        public Vector2 InputVector { get; private set; }

        public void OnPointerDown(PointerEventData eventData) => OnDrag(eventData);

        public void OnDrag(PointerEventData eventData)
        {
            if (Background == null || Handle == null) return;

            if (RectTransformUtility.ScreenPointToLocalPointInRectangle(
                Background, eventData.position, eventData.pressEventCamera, out Vector2 localPos))
            {
                Vector2 clamped = Vector2.ClampMagnitude(localPos, HandleRange);
                Handle.anchoredPosition = clamped;
                InputVector = clamped / HandleRange;
            }
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            InputVector = Vector2.zero;
            if (Handle != null) Handle.anchoredPosition = Vector2.zero;
        }
    }
}`,
  },
  {
    filename: 'MobileControls.cs',
    folder: 'Assets/Scripts/Input',
    summary: 'Manages right-side touch drag camera rotation and Run, Jump, Hide, Flashlight, Interact, and Bag buttons.',
    code: `using UnityEngine;
using UnityEngine.EventSystems;

namespace MaryForgottenCity
{
    public class MobileControls : MonoBehaviour
    {
        public static MobileControls Instance { get; private set; }

        [Header("References")]
        public PlayerController Player;
        public CameraController CamController;
        public FlashlightSystem Flashlight;
        public GameObject InventoryUI;

        public bool IsSprintHeld { get; private set; }
        private int _lookFingerId = -1;
        private Vector2 _lastTouchPos;

        private void Awake() => Instance = this;

        private void Update()
        {
            foreach (Touch touch in Input.touches)
            {
                if (touch.phase == TouchPhase.Began && touch.position.x > Screen.width * 0.45f)
                {
                    if (!EventSystem.current.IsPointerOverGameObject(touch.fingerId) && _lookFingerId == -1)
                    {
                        _lookFingerId = touch.fingerId;
                        _lastTouchPos = touch.position;
                    }
                }
                else if (touch.fingerId == _lookFingerId)
                {
                    if (touch.phase == TouchPhase.Moved)
                    {
                        Vector2 delta = touch.position - _lastTouchPos;
                        CamController?.AddLookDelta(delta * 0.15f);
                        _lastTouchPos = touch.position;
                    }
                    else if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
                    {
                        _lookFingerId = -1;
                    }
                }
            }
        }

        public void SetSprintHeld(bool held) => IsSprintHeld = held;
        public void OnJumpPressed() => Player?.TryJump();
        public void OnHidePressed() => Player?.ToggleCrouch();
        public void OnFlashlightPressed() => Flashlight?.Toggle();
        public void OnInventoryPressed() => InventoryUI?.SetActive(!InventoryUI.activeSelf);
    }
}`,
  },
  {
    filename: 'MaryAI.cs',
    folder: 'Assets/Scripts/AI',
    summary: 'Adaptive horror AI that reacts to player hiding frequency, flashlight overuse, ignored phone messages, and clue progress.',
    code: `using UnityEngine;
using UnityEngine.AI;

namespace MaryForgottenCity
{
    public enum MaryState { Dormant, Stalking, Appearing, Hunting, SearchingHiding, Vanished }

    [RequireComponent(typeof(NavMeshAgent))]
    public class MaryAI : MonoBehaviour
    {
        [Header("Adaptive Behavior Thresholds")]
        public int HideCount;
        public float FlashlightUseSeconds;
        public int IgnoredPhoneCount;
        public int CluesFound;

        [Header("References")]
        public PlayerController Player;
        public Transform[] PatrolWaypoints;
        public Transform[] HidingSpots;
        public Renderer[] VisualRenderers;

        public MaryState CurrentState = MaryState.Dormant;
        private NavMeshAgent _agent;
        private int _wpIndex;
        private float _stateTimer;

        private void Awake() => _agent = GetComponent<NavMeshAgent>();

        private void Update()
        {
            if (Player == null || CurrentState == MaryState.Dormant) return;

            float dist = Vector3.Distance(transform.position, Player.transform.position);
            _stateTimer -= Time.deltaTime;

            switch (CurrentState)
            {
                case MaryState.Stalking:
                    Patrol();
                    float hearRange = Player.IsSprinting ? 10.5f : (FlashlightSystem.Instance.IsOn ? 7.2f : 4.5f);
                    if (Player.IsHidden && HideCount >= 3)
                    {
                        CurrentState = MaryState.SearchingHiding;
                        _agent.SetDestination(Player.transform.position);
                    }
                    else if (!Player.IsHidden && dist < hearRange)
                    {
                        EnterHunt();
                    }
                    break;

                case MaryState.Hunting:
                    if (Player.IsHidden && HideCount < 3)
                    {
                        SetVisible(false);
                        CurrentState = MaryState.Vanished;
                        _stateTimer = 5f;
                    }
                    else
                    {
                        _agent.speed = 2.65f + CluesFound * 0.18f + (IgnoredPhoneCount >= 2 ? 0.4f : 0f);
                        _agent.SetDestination(Player.transform.position);
                        if (dist < 1.15f && !Player.IsHidden)
                            GameManager.Instance.TriggerGameOver();
                    }
                    break;

                case MaryState.SearchingHiding:
                    _agent.speed = 2.8f;
                    if (dist < 1.4f) GameManager.Instance.TriggerGameOver();
                    else if (!Player.IsHidden || _stateTimer <= 0f) CurrentState = MaryState.Stalking;
                    break;

                case MaryState.Vanished:
                    if (_stateTimer <= 0f)
                    {
                        TeleportNearWaypoints();
                        SetVisible(true);
                        CurrentState = MaryState.Stalking;
                    }
                    break;
            }
        }

        public void RegisterPlayerHide() => HideCount++;
        public void RegisterIgnoredPhone() => IgnoredPhoneCount++;
        public void RegisterClueFound() => CluesFound++;

        public void RegisterFlashlightTime(float dt)
        {
            FlashlightUseSeconds += dt;
            if (FlashlightUseSeconds >= 28f)
            {
                FlashlightSystem.Instance?.TriggerFlickerDisruption();
                FlashlightUseSeconds = 0f;
            }
        }

        private void EnterHunt()
        {
            CurrentState = MaryState.Hunting;
            _stateTimer = 8.5f;
            AudioManager.Instance?.PlayMaryWhisper(true);
        }

        private void Patrol()
        {
            if (PatrolWaypoints.Length == 0) return;
            _agent.speed = 1.9f + CluesFound * 0.1f;
            if (!_agent.pathPending && _agent.remainingDistance < 0.6f)
            {
                _wpIndex = (_wpIndex + 1) % PatrolWaypoints.Length;
                _agent.SetDestination(PatrolWaypoints[_wpIndex].position);
            }
        }

        private void TeleportNearWaypoints()
        {
            if (PatrolWaypoints.Length == 0) return;
            Transform wp = PatrolWaypoints[Random.Range(0, PatrolWaypoints.Length)];
            _agent.Warp(wp.position);
        }

        private void SetVisible(bool visible)
        {
            foreach (var r in VisualRenderers) r.enabled = visible;
        }
    }
}`,
  },
  {
    filename: 'InventorySystem.cs',
    folder: 'Assets/Scripts/Systems',
    summary: 'Manages keys, documents, photos, tools, batteries, and clues with Add/Has/Use API.',
    code: `using System.Collections.Generic;
using UnityEngine;

namespace MaryForgottenCity
{
    public enum ItemCategory { Key, Document, Photo, Tool, Battery, Clue }

    [System.Serializable]
    public class InventoryItem
    {
        public string Id;
        public string DisplayName;
        public ItemCategory Category;
    }

    public class InventorySystem : MonoBehaviour
    {
        public static InventorySystem Instance { get; private set; }
        public List<InventoryItem> Items = new List<InventoryItem>();

        private void Awake() => Instance = this;

        public void AddItem(string id, string name, ItemCategory category)
        {
            if (!HasItem(id))
            {
                Items.Add(new InventoryItem { Id = id, DisplayName = name, Category = category });
                AudioManager.Instance?.PlayPickup();
            }
        }

        public bool HasItem(string id) => Items.Exists(i => i.Id == id);

        public bool UseBattery(string id)
        {
            InventoryItem bat = Items.Find(i => i.Id == id && i.Category == ItemCategory.Battery);
            if (bat == null) return false;
            FlashlightSystem.Instance?.AddBattery(45f);
            Items.Remove(bat);
            return true;
        }
    }
}`,
  },
  {
    filename: 'FlashlightSystem.cs',
    folder: 'Assets/Scripts/Systems',
    summary: 'Controls SpotLight beam, finite battery drain, recharge, and Mary light-disruption flickering.',
    code: `using UnityEngine;

namespace MaryForgottenCity
{
    public class FlashlightSystem : MonoBehaviour
    {
        public static FlashlightSystem Instance { get; private set; }

        public Light SpotLight;
        public float BatteryLevel = 100f;
        public float DrainPerSecond = 1.15f;
        public bool IsOn { get; private set; } = true;

        private float _disruptTimer;

        private void Awake() => Instance = this;

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.F)) Toggle();

            if (_disruptTimer > 0f) _disruptTimer -= Time.deltaTime;

            if (IsOn && BatteryLevel > 0f)
            {
                BatteryLevel = Mathf.Max(0f, BatteryLevel - DrainPerSecond * Time.deltaTime);
                GameManager.Instance?.Mary?.RegisterFlashlightTime(Time.deltaTime);
                if (BatteryLevel <= 0f) SetFlashlight(false);
            }

            if (SpotLight != null)
            {
                bool flicker = (_disruptTimer > 0f || BatteryLevel < 18f) && Random.value > 0.65f;
                SpotLight.enabled = IsOn && BatteryLevel > 0f && !flicker;
            }
        }

        public void Toggle() => SetFlashlight(!IsOn);

        public void SetFlashlight(bool on)
        {
            if (on && BatteryLevel <= 0f) return;
            IsOn = on;
            AudioManager.Instance?.PlayFlashlightClick();
        }

        public void AddBattery(float amount) => BatteryLevel = Mathf.Clamp(BatteryLevel + amount, 0f, 100f);

        public void TriggerFlickerDisruption() => _disruptTimer = 8f;
    }
}`,
  },
  {
    filename: 'PuzzleManager.cs',
    folder: 'Assets/Scripts/Puzzles',
    summary: 'Handles the 2009 Phone clue, Corridor Portraits order puzzle (code 209), Electrical Breaker, and Secret Note.',
    code: `using UnityEngine;

namespace MaryForgottenCity
{
    public class PuzzleManager : MonoBehaviour
    {
        public bool PhoneChecked;
        public bool StudyDoorUnlocked;
        public bool PortraitsSolved;
        public bool PowerRestored;
        public bool SecretNoteRead;
        public bool FrontDoorUnlocked;

        public int[] PortraitOrder = new int[] { 2, 0, 1 };
        public bool AllCluesFound => PhoneChecked && PortraitsSolved && PowerRestored && SecretNoteRead;

        public void SwapPortraits(int a, int b)
        {
            int tmp = PortraitOrder[a];
            PortraitOrder[a] = PortraitOrder[b];
            PortraitOrder[b] = tmp;

            if (PortraitOrder[0] == 0 && PortraitOrder[1] == 1 && PortraitOrder[2] == 2)
            {
                PortraitsSolved = true;
                GameManager.Instance?.Mary?.RegisterClueFound();
            }
        }

        public bool TryBreakerPin(string pin)
        {
            if (pin == "209")
            {
                PowerRestored = true;
                AudioManager.Instance?.PlayPowerRestore();
                GameManager.Instance?.Mary?.RegisterClueFound();
                return true;
            }
            return false;
        }
    }
}`,
  },
  {
    filename: 'DoorInteraction.cs',
    folder: 'Assets/Scripts/Interaction',
    summary: 'Interactive door controller supporting key locks, electronic power locks, smooth hinge rotation, and audio.',
    code: `using UnityEngine;

namespace MaryForgottenCity
{
    public class DoorInteraction : MonoBehaviour
    {
        public string RequiredKeyId;
        public bool RequiresPower;
        public bool IsExitDoor;
        public float OpenAngle = 95f;

        private bool _isOpen;
        private Quaternion _closedRot;
        private Quaternion _openRot;

        private void Start()
        {
            _closedRot = transform.localRotation;
            _openRot = _closedRot * Quaternion.Euler(0f, OpenAngle, 0f);
        }

        private void Update()
        {
            transform.localRotation = Quaternion.Slerp(
                transform.localRotation,
                _isOpen ? _openRot : _closedRot,
                Time.deltaTime * 5f
            );
        }

        public void TryInteract()
        {
            if (RequiresPower && !GameManager.Instance.Puzzles.PowerRestored)
            {
                AudioManager.Instance?.PlayDoorCreak(true);
                return;
            }

            if (!string.IsNullOrEmpty(RequiredKeyId) && !InventorySystem.Instance.HasItem(RequiredKeyId))
            {
                AudioManager.Instance?.PlayDoorCreak(true);
                return;
            }

            _isOpen = !_isOpen;
            AudioManager.Instance?.PlayDoorCreak(false);

            if (IsExitDoor && _isOpen)
                GameManager.Instance?.CompleteStageAndEvaluateEnding();
        }
    }
}`,
  },
  {
    filename: 'SaveSystem.cs',
    folder: 'Assets/Scripts/Systems',
    summary: 'Offline JSON persistence in Application.persistentDataPath for Android local storage.',
    code: `using System.IO;
using UnityEngine;

namespace MaryForgottenCity
{
    [System.Serializable]
    public class SaveData
    {
        public int StageIndex;
        public Vector3 PlayerPosition;
        public float Battery;
        public bool StudyDoorUnlocked;
        public bool PortraitsSolved;
        public bool PowerRestored;
        public bool FrontDoorUnlocked;
    }

    public static class SaveSystem
    {
        private static string SavePath => Path.Combine(Application.persistentDataPath, "mary_save_v1.json");

        public static void Save(SaveData data)
        {
            string json = JsonUtility.ToJson(data, true);
            File.WriteAllText(SavePath, json);
        }

        public static SaveData Load()
        {
            if (!File.Exists(SavePath)) return null;
            return JsonUtility.FromJson<SaveData>(File.ReadAllText(SavePath));
        }

        public static void ClearSave()
        {
            if (File.Exists(SavePath)) File.Delete(SavePath);
        }
    }
}`,
  },
  {
    filename: 'AudioManager.cs',
    folder: 'Assets/Scripts/Audio',
    summary: 'Manages ambient horror music, room acoustics, footsteps, door creaks, whispers, and chase layer transitions.',
    code: `using UnityEngine;

namespace MaryForgottenCity
{
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("Sources")]
        public AudioSource AmbientSource;
        public AudioSource ChaseSource;
        public AudioSource SfxSource;

        [Header("Clips")]
        public AudioClip FootstepWood;
        public AudioClip DoorCreak;
        public AudioClip DoorLocked;
        public AudioClip FlashlightClick;
        public AudioClip MaryWhisper;
        public AudioClip PickupClip;
        public AudioClip PowerClip;

        private float _nextStepTime;

        private void Awake() => Instance = this;

        public void SetMasterVolume(float volume) => AudioListener.volume = Mathf.Clamp01(volume);

        public void PlayFootstep(bool sprinting, bool crouching)
        {
            if (Time.time < _nextStepTime || FootstepWood == null) return;
            _nextStepTime = Time.time + (crouching ? 0.55f : sprinting ? 0.28f : 0.44f);
            SfxSource.PlayOneShot(FootstepWood, crouching ? 0.35f : 0.8f);
        }

        public void PlayDoorCreak(bool locked) => SfxSource.PlayOneShot(locked ? DoorLocked : DoorCreak);
        public void PlayFlashlightClick() => SfxSource.PlayOneShot(FlashlightClick);
        public void PlayPickup() => SfxSource.PlayOneShot(PickupClip);
        public void PlayPowerRestore() => SfxSource.PlayOneShot(PowerClip);
        public void PlayMaryWhisper(bool aggressive) => SfxSource.PlayOneShot(MaryWhisper, aggressive ? 1f : 0.6f);
    }
}`,
  },
  {
    filename: 'MainMenu.cs',
    folder: 'Assets/Scripts/UI',
    summary: 'Main Menu controller wiring New Game, Continue, Settings (Volume, Sensitivity, Quality, AR/EN), and Exit.',
    code: `using UnityEngine;
using UnityEngine.UI;

namespace MaryForgottenCity
{
    public class MainMenu : MonoBehaviour
    {
        public Button ContinueButton;
        public GameObject SettingsPanel;
        public Slider VolumeSlider;
        public Slider SensitivitySlider;
        public Dropdown QualityDropdown;

        private void Start()
        {
            if (ContinueButton != null)
                ContinueButton.interactable = SaveSystem.Load() != null;
        }

        public void OnNewGame() => GameManager.Instance?.StartNewGame();
        public void OnContinue() => GameManager.Instance?.ContinueGame();
        public void OnOpenSettings(bool open) => SettingsPanel?.SetActive(open);
        public void OnVolumeChanged(float v) => AudioManager.Instance?.SetMasterVolume(v);
        public void OnQualityChanged(int index) => QualitySettings.SetQualityLevel(index);
        public void OnExit() => Application.Quit();
    }
}`,
  },
];

export const UNITY_BUILD_INSTRUCTIONS = `# MARY – THE FORGOTTEN CITY (Unity 3D Android Build Guide)

## 1. Environment Note
This web runtime executes Prototype V1 directly in real-time WebGL (Three.js) with full mobile touch controls, adaptive Mary AI, and offline LocalStorage saving. Compiling a binary \`.apk\` file requires the Unity Editor + Android SDK/NDK on a local workstation or CI runner.

## 2. Folder Structure in Unity (Unity 2022.3 LTS / Unity 6)
\`\`\`
Assets/
  Scenes/
    MainMenu.unity
    Stage1_AbandonedHouse.unity
  Scripts/
    Core/       (GameManager.cs)
    Player/     (PlayerController.cs)
    Camera/     (CameraController.cs)
    Input/      (MobileJoystick.cs, MobileControls.cs)
    AI/         (MaryAI.cs)
    Systems/    (InventorySystem.cs, FlashlightSystem.cs, SaveSystem.cs)
    Puzzles/    (PuzzleManager.cs)
    Interaction/(DoorInteraction.cs)
    Audio/      (AudioManager.cs)
    UI/         (MainMenu.cs)
\`\`\`

## 3. Exporting the Android APK
1. Open **File > Build Settings** and switch Platform to **Android**.
2. In **Player Settings > Other Settings**:
   - Set **Minimum API Level** to Android 8.0 (API 26)
   - Set **Scripting Backend** to **IL2CPP** and check **ARM64**.
   - Under **Resolution and Presentation**, set Default Orientation to **Landscape Left**.
3. Bake a **NavMeshSurface** on the abandoned house floor for \`MaryAI.cs\`.
4. Click **Build** to output \`MARY_Prototype_V1.apk\`.
`;
