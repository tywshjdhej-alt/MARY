import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioManager } from './audio/AudioManager';
import { BreakerPuzzleModal } from './components/BreakerPuzzleModal';
import { GameHUD } from './components/GameHUD';
import { InventoryModal } from './components/InventoryModal';
import { MainMenu } from './components/MainMenu';
import { MobileControlsOverlay } from './components/MobileControlsOverlay';
import {
  CaughtModal,
  EscapedModal,
  IntroOverlay,
  NoteModal,
  PauseModal,
} from './components/OverlaysAndEndings';
import { PhoneModal } from './components/PhoneModal';
import { PortraitsPuzzleModal } from './components/PortraitsPuzzleModal';
import { SettingsModal } from './components/SettingsModal';
import { UnityExportModal } from './components/UnityExportModal';
import { GameEngine } from './game/GameEngine';
import { SaveSystem, createInitialSaveData } from './game/SaveSystem';
import {
  GamePhase,
  GameSettings,
  HUDStateSnapshot,
  InventoryItemId,
  SaveData,
} from './types/game';

const INITIAL_HUD: HUDStateSnapshot = {
  battery: 100,
  flashlightOn: true,
  isHidden: false,
  isCrouching: false,
  isSprinting: false,
  maryDistance: 99,
  maryState: 'dormant',
  nearbyInteractable: null,
  currentRoomKey: 'room_bedroom',
  objectiveKey: 'obj_check_phone',
  alertMessageKey: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager>(new AudioManager());

  const [settings, setSettings] = useState<GameSettings>(() => SaveSystem.loadSettings());
  const [saveData, setSaveData] = useState<SaveData>(
    () => SaveSystem.loadGame() ?? createInitialSaveData(),
  );
  const [hasSavedRun, setHasSavedRun] = useState<boolean>(() => SaveSystem.hasSave());
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [settingsReturnPhase, setSettingsReturnPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<HUDStateSnapshot>(INITIAL_HUD);

  const saveRef = useRef(saveData);
  saveRef.current = saveData;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const commitSave = useCallback((next: SaveData) => {
    saveRef.current = next;
    setSaveData(next);
    SaveSystem.saveGame(next);
    setHasSavedRun(true);
  }, []);

  const handleInteract = useCallback(
    (id: string) => {
      const current = { ...saveRef.current };
      const engine = engineRef.current;
      const audio = audioRef.current;
      if (!engine) return;

      if (id === 'old_phone') {
        if (!current.inventory.includes('old_phone')) {
          current.inventory = [...current.inventory, 'old_phone'];
        }
        current.solvedPuzzles = { ...current.solvedPuzzles, phoneChecked: true };
        current.hasUnreadPhoneMessage = false;
        commitSave(current);
        engine.applySaveState(current);
        engine.setPhase('phone_view');
        setPhase('phone_view');
        return;
      }

      if (id === 'study_key' || id === 'battery_1' || id === 'battery_2' || id === 'front_door_key') {
        const itemId = id as InventoryItemId;
        if (!current.inventory.includes(itemId)) {
          current.inventory = [...current.inventory, itemId];
        }
        audio.playPickup();
        commitSave(current);
        engine.applySaveState(current);
        return;
      }

      if (id === 'secret_letter') {
        if (!current.inventory.includes('secret_letter')) {
          current.inventory = [...current.inventory, 'secret_letter'];
        }
        if (!current.solvedPuzzles.secretNote) {
          current.solvedPuzzles = { ...current.solvedPuzzles, secretNote: true };
          current.choices = { ...current.choices, readSecretLetter: true };
          current.maryMetrics = {
            ...current.maryMetrics,
            cluesFoundCount: current.maryMetrics.cluesFoundCount + 1,
          };
        }
        audio.playPickup();
        commitSave(current);
        engine.applySaveState(current);
        engine.setPhase('note_view');
        setPhase('note_view');
        return;
      }

      if (id === 'portraits_puzzle') {
        engine.setPhase('puzzle_portraits');
        setPhase('puzzle_portraits');
        return;
      }

      if (id === 'study_door') {
        if (current.inventory.includes('study_key')) {
          current.solvedPuzzles = { ...current.solvedPuzzles, studyDoor: true };
          current.hasUnreadPhoneMessage = true;
          audio.playDoorCreak(false);
          audio.playPhoneRing();
          commitSave(current);
          engine.applySaveState(current);
        } else {
          audio.playDoorCreak(true);
        }
        return;
      }

      if (id === 'breaker_box') {
        engine.setPhase('puzzle_breaker');
        setPhase('puzzle_breaker');
        return;
      }

      if (id === 'front_door') {
        if (current.solvedPuzzles.breaker && current.inventory.includes('front_door_key')) {
          current.solvedPuzzles = { ...current.solvedPuzzles, frontDoor: true };
          audio.playDoorCreak(false);
          commitSave(current);
          engine.applySaveState(current);
          engine.setPhase('escaped');
          setPhase('escaped');
        } else {
          audio.playDoorCreak(true);
        }
      }
    },
    [commitSave],
  );

  // Mount Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(
      mount,
      saveRef.current,
      settings,
      audioRef.current,
      {
        onHudUpdate: (snapshot) => setHud(snapshot),
        onInteract: (id) => handleInteract(id),
        onSaveChanged: (updated) => commitSave(updated),
        onCaught: () => {
          engineRef.current?.setPhase('caught');
          setPhase('caught');
        },
        onEscaped: () => {
          engineRef.current?.setPhase('escaped');
          setPhase('escaped');
        },
        onIntroFinished: () => {
          engineRef.current?.setPhase('playing');
          setPhase('playing');
        },
        onAlert: () => {},
      },
    );

    engineRef.current = engine;
    engine.setPhase('menu');

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic offline autosave while playing
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const tf = engine.getCurrentTransformForSave();
      const next: SaveData = {
        ...saveRef.current,
        playerPos: tf.pos,
        playerYaw: tf.yaw,
      };
      commitSave(next);
    }, 10000);
    return () => clearInterval(timer);
  }, [phase, commitSave]);

  // Global keyboard shortcuts (Escape, Inventory I/Tab)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = phaseRef.current;
      if (e.code === 'Escape') {
        if (cur === 'playing') {
          engineRef.current?.setPhase('paused');
          setPhase('paused');
        } else if (
          cur === 'paused' ||
          cur === 'inventory' ||
          cur === 'phone_view' ||
          cur === 'puzzle_portraits' ||
          cur === 'puzzle_breaker' ||
          cur === 'note_view'
        ) {
          engineRef.current?.setPhase('playing');
          setPhase('playing');
        } else if (cur === 'settings') {
          engineRef.current?.setPhase(settingsReturnPhase);
          setPhase(settingsReturnPhase);
        } else if (cur === 'unity_export') {
          engineRef.current?.setPhase('menu');
          setPhase('menu');
        }
      } else if ((e.code === 'KeyI' || e.code === 'Tab') && cur === 'playing') {
        e.preventDefault();
        engineRef.current?.setPhase('inventory');
        setPhase('inventory');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsReturnPhase]);

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    SaveSystem.saveSettings(next);
    engineRef.current?.applySettings(next);
  };

  const handleNewGame = () => {
    audioRef.current.init();
    const fresh = createInitialSaveData();
    commitSave(fresh);
    engineRef.current?.applySaveState(fresh);
    engineRef.current?.setPhase('intro');
    setPhase('intro');
  };

  const handleContinue = () => {
    audioRef.current.init();
    const loaded = SaveSystem.loadGame() ?? saveData;
    commitSave(loaded);
    engineRef.current?.applySaveState(loaded);
    engineRef.current?.setPhase('playing');
    setPhase('playing');
  };

  const handleSaveAndQuit = () => {
    const engine = engineRef.current;
    if (engine) {
      const tf = engine.getCurrentTransformForSave();
      commitSave({ ...saveRef.current, playerPos: tf.pos, playerYaw: tf.yaw });
      engine.setPhase('menu');
    }
    setPhase('menu');
  };

  const handleUseInventoryItem = (id: InventoryItemId) => {
    if (id === 'old_phone') {
      engineRef.current?.setPhase('phone_view');
      setPhase('phone_view');
      return;
    }
    if (id === 'secret_letter') {
      engineRef.current?.setPhase('note_view');
      setPhase('note_view');
      return;
    }
    if (id === 'battery_1' || id === 'battery_2') {
      const cur = saveRef.current;
      const next: SaveData = {
        ...cur,
        battery: Math.min(100, cur.battery + 45),
        inventory: cur.inventory.filter((x) => x !== id),
        usedItems: [...cur.usedItems, id],
      };
      audioRef.current.playPickup();
      commitSave(next);
      engineRef.current?.applySaveState(next);
    }
  };

  const handlePhoneReply = () => {
    const cur = saveRef.current;
    const next: SaveData = {
      ...cur,
      hasUnreadPhoneMessage: false,
      choices: { ...cur.choices, repliedToMary: true },
    };
    audioRef.current.playMaryWhisper(false);
    commitSave(next);
  };

  const handlePhoneIgnore = () => {
    const cur = saveRef.current;
    if (!cur.choices.repliedToMary) {
      const ignored = cur.maryMetrics.ignoredPhoneCount + 1;
      const aggressive = ignored >= 2;
      const next: SaveData = {
        ...cur,
        hasUnreadPhoneMessage: false,
        maryMetrics: {
          ...cur.maryMetrics,
          ignoredPhoneCount: ignored,
          maryAggressiveSpawn: aggressive,
        },
      };
      commitSave(next);
      if (aggressive) {
        engineRef.current?.pushAlert('maryAngryPhone', 4.5);
        engineRef.current?.triggerApparitionSting(true);
      }
    }
    engineRef.current?.setPhase('playing');
    setPhase('playing');
  };

  const handleSwapPortraits = (idxA: number, idxB: number) => {
    const cur = saveRef.current;
    const nextOrder = [...cur.portraitOrder];
    const tmp = nextOrder[idxA];
    nextOrder[idxA] = nextOrder[idxB];
    nextOrder[idxB] = tmp;

    const isSolved = nextOrder[0] === 0 && nextOrder[1] === 1 && nextOrder[2] === 2;
    const nextInventory =
      isSolved && !cur.inventory.includes('photo_clue')
        ? ([...cur.inventory, 'photo_clue'] as InventoryItemId[])
        : cur.inventory;

    const next: SaveData = {
      ...cur,
      portraitOrder: nextOrder,
      inventory: nextInventory,
      solvedPuzzles: { ...cur.solvedPuzzles, portraits: isSolved || cur.solvedPuzzles.portraits },
      maryMetrics: {
        ...cur.maryMetrics,
        cluesFoundCount:
          isSolved && !cur.solvedPuzzles.portraits
            ? cur.maryMetrics.cluesFoundCount + 1
            : cur.maryMetrics.cluesFoundCount,
      },
    };
    if (isSolved) audioRef.current.playPickup();
    commitSave(next);
    engineRef.current?.syncPortraitOrder(nextOrder);
  };

  const handleBreakerSolved = () => {
    const cur = saveRef.current;
    const next: SaveData = {
      ...cur,
      solvedPuzzles: { ...cur.solvedPuzzles, breaker: true },
      maryMetrics: {
        ...cur.maryMetrics,
        cluesFoundCount: cur.solvedPuzzles.breaker
          ? cur.maryMetrics.cluesFoundCount
          : cur.maryMetrics.cluesFoundCount + 1,
      },
    };
    audioRef.current.playPowerRestore();
    commitSave(next);
    engineRef.current?.applySaveState(next);
    engineRef.current?.syncPowerVisuals();
  };

  const handleChangeOutfit = (idx: number) => {
    const next = { ...saveRef.current, outfitColorIndex: idx };
    commitSave(next);
    engineRef.current?.applySaveState(next);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07080b]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Title Screen */}
      {phase === 'menu' && (
        <MainMenu
          settings={settings}
          hasSave={hasSavedRun}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onOpenSettings={() => {
            setSettingsReturnPhase('menu');
            setPhase('settings');
          }}
          onOpenUnityPack={() => setPhase('unity_export')}
          onToggleLanguage={() =>
            updateSettings({
              ...settings,
              language: settings.language === 'ar' ? 'en' : 'ar',
            })
          }
          onToggleMute={() => updateSettings({ ...settings, muted: !settings.muted })}
        />
      )}

      {/* Cinematic Intro */}
      {phase === 'intro' && (
        <IntroOverlay
          language={settings.language}
          onSkip={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
        />
      )}

      {/* Active Gameplay HUD & Touch Controls */}
      {phase === 'playing' && (
        <>
          <MobileControlsOverlay
            language={settings.language}
            visible={settings.showTouchControls}
            canInteract={Boolean(hud.nearbyInteractable)}
            flashlightOn={hud.flashlightOn}
            isHidden={hud.isHidden}
            isCrouching={hud.isCrouching}
            hasUnreadPhone={saveData.hasUnreadPhoneMessage}
            onJoystickMove={(x, y) => engineRef.current?.setJoystick(x, y)}
            onLookDrag={(dx, dy) => engineRef.current?.rotateCameraBy(dx, dy)}
            onSprintChange={(active) => engineRef.current?.setTouchSprint(active)}
            onJump={() => engineRef.current?.triggerJump()}
            onHideToggle={() => engineRef.current?.toggleCrouchOrHide()}
            onFlashlightToggle={() => engineRef.current?.toggleFlashlight()}
            onInteract={() => engineRef.current?.triggerInteract()}
            onOpenInventory={() => {
              engineRef.current?.setPhase('inventory');
              setPhase('inventory');
            }}
            onOpenPhone={() => {
              engineRef.current?.setPhase('phone_view');
              setPhase('phone_view');
            }}
          />

          <GameHUD
            hud={hud}
            settings={settings}
            hasUnreadPhone={saveData.hasUnreadPhoneMessage}
            onPause={() => {
              engineRef.current?.setPhase('paused');
              setPhase('paused');
            }}
            onToggleMute={() => updateSettings({ ...settings, muted: !settings.muted })}
            onOpenInventory={() => {
              engineRef.current?.setPhase('inventory');
              setPhase('inventory');
            }}
            onOpenPhone={() => {
              engineRef.current?.setPhase('phone_view');
              setPhase('phone_view');
            }}
            onInteract={() => engineRef.current?.triggerInteract()}
          />
        </>
      )}

      {/* Inventory Modal */}
      {phase === 'inventory' && (
        <InventoryModal
          language={settings.language}
          items={saveData.inventory}
          battery={saveData.battery}
          onUseItem={handleUseInventoryItem}
          onClose={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
        />
      )}

      {/* 2009 Phone Modal */}
      {phase === 'phone_view' && (
        <PhoneModal
          language={settings.language}
          saveData={saveData}
          onReply={handlePhoneReply}
          onIgnore={handlePhoneIgnore}
        />
      )}

      {/* Secret Letter Modal */}
      {phase === 'note_view' && (
        <NoteModal
          language={settings.language}
          onClose={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
        />
      )}

      {/* Corridor Portraits Puzzle */}
      {phase === 'puzzle_portraits' && (
        <PortraitsPuzzleModal
          language={settings.language}
          order={saveData.portraitOrder}
          solved={saveData.solvedPuzzles.portraits}
          onSwap={handleSwapPortraits}
          onClose={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
        />
      )}

      {/* Study Breaker Keypad */}
      {phase === 'puzzle_breaker' && (
        <BreakerPuzzleModal
          language={settings.language}
          solved={saveData.solvedPuzzles.breaker}
          onSolve={handleBreakerSolved}
          onClose={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <PauseModal
          language={settings.language}
          onResume={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
          onOpenSettings={() => {
            setSettingsReturnPhase('paused');
            setPhase('settings');
          }}
          onRestart={handleNewGame}
          onSaveAndQuit={handleSaveAndQuit}
        />
      )}

      {/* Settings Modal */}
      {phase === 'settings' && (
        <SettingsModal
          settings={settings}
          outfitColorIndex={saveData.outfitColorIndex}
          onUpdateSettings={updateSettings}
          onChangeOutfit={handleChangeOutfit}
          onClose={() => setPhase(settingsReturnPhase)}
        />
      )}

      {/* Unity C# Exporter Modal */}
      {phase === 'unity_export' && (
        <UnityExportModal
          language={settings.language}
          onClose={() => setPhase('menu')}
        />
      )}

      {/* Caught by Mary */}
      {phase === 'caught' && (
        <CaughtModal
          language={settings.language}
          onRetry={handleContinue}
          onExitMenu={() => {
            engineRef.current?.setPhase('menu');
            setPhase('menu');
          }}
        />
      )}

      {/* Stage 1 Escaped */}
      {phase === 'escaped' && (
        <EscapedModal
          language={settings.language}
          saveData={saveData}
          onReplay={handleNewGame}
          onExitMenu={() => {
            engineRef.current?.setPhase('menu');
            setPhase('menu');
          }}
        />
      )}
    </div>
  );
}
