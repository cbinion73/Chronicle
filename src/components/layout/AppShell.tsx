import { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NewEntryModal from '../ui/NewEntryModal';
import SearchModal from '../ui/SearchModal';
import ToastContainer from '../ui/ToastContainer';
import AIChatPanel from '../ui/AIChatPanel';
import AISelectionMenu from '../ui/AISelectionMenu';
import { useAppStore } from '../../store';
import { useAIChatStore } from '../../store/aiChatStore';
import { CHRONICLE_APP_VERSION, CHRONICLE_ONBOARDING_STEPS, CHRONICLE_TAGLINE } from '../../lib/chronicleBrand';
import { useResponsiveLayout } from '../../lib/useResponsiveLayout';
import { useToastStore } from '../../store/toastStore';
import s from './AppShell.module.css';

const START_HERE_DISMISSED_KEY = 'chronicle-start-here-dismissed';
const JARVIS_BRIDGE_KEY = 'chronicle-jarvis-bridge-v1';

interface JarvisBridgeState {
  active: boolean;
  requestId: string;
  capability: string;
  summary: string;
  returnUrl: string;
  returnPacket: string;
  targetPath: string;
}

function bridgeTargetPath(capability: string) {
  if (capability === 'study_passage') return '/bible';
  if (capability === 'prayer_session') return '/prayer';
  return '/chronicle';
}

function bridgeSummary(capability: string) {
  if (capability === 'study_passage') return 'Sent to Chronicle for passage study.';
  if (capability === 'prayer_session') return 'Sent to Chronicle for prayer.';
  if (capability === 'formation_memory_lookup') return 'Sent to Chronicle for formation memory lookup.';
  if (capability === 'record_spiritual_event') return 'Sent to Chronicle to capture this moment.';
  return 'Sent to Chronicle from JARVIS.';
}

function readJarvisBridge(search: string): JarvisBridgeState {
  const fallback: JarvisBridgeState = {
    active: false,
    requestId: '',
    capability: '',
    summary: '',
    returnUrl: 'http://127.0.0.1:8787',
    returnPacket: 'chronicle',
    targetPath: '/chronicle',
  };

  if (typeof window === 'undefined') return fallback;

  const params = new URLSearchParams(search);
  const hasQueryBridge = params.get('jarvis') === '1';
  if (hasQueryBridge) {
    const requestId = params.get('jarvisRequestId') || '';
    const capability = params.get('jarvisCapability') || 'spiritual_timeline';
    const nextState: JarvisBridgeState = {
      active: true,
      requestId,
      capability,
      summary: params.get('jarvisSummary') || bridgeSummary(capability),
      returnUrl: params.get('jarvisReturnUrl') || 'http://127.0.0.1:8787',
      returnPacket: params.get('jarvisReturnPacket') || 'chronicle',
      targetPath: bridgeTargetPath(capability),
    };
    window.sessionStorage.setItem(JARVIS_BRIDGE_KEY, JSON.stringify(nextState));
    return nextState;
  }

  try {
    const stored = window.sessionStorage.getItem(JARVIS_BRIDGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<JarvisBridgeState>;
    if (!parsed || parsed.active !== true) return fallback;
    return {
      active: true,
      requestId: typeof parsed.requestId === 'string' ? parsed.requestId : '',
      capability: typeof parsed.capability === 'string' ? parsed.capability : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      returnUrl: typeof parsed.returnUrl === 'string' ? parsed.returnUrl : 'http://127.0.0.1:8787',
      returnPacket: typeof parsed.returnPacket === 'string' ? parsed.returnPacket : 'chronicle',
      targetPath: typeof parsed.targetPath === 'string' ? parsed.targetPath : '/chronicle',
    };
  } catch {
    return fallback;
  }
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [chatPreference, setChatPreference] = useState<'auto' | 'collapsed' | 'expanded'>('auto');
  const [startHereDismissed, setStartHereDismissed] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem(START_HERE_DISMISSED_KEY) === 'true'
  ));
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [bridgeDismissed, setBridgeDismissed] = useState(false);
  const { deviceClass } = useResponsiveLayout();
  const chronicleEntries = useAppStore((state) => state.chronicleEntries);
  const ownedBooks = useAppStore((state) => state.ownedBooks);
  const prayerItems = useAppStore((state) => state.prayerItems);
  const openSelectionMenu = useAIChatStore((state) => state.openSelectionMenu);
  const closeSelectionMenu = useAIChatStore((state) => state.closeSelectionMenu);
  const { addToast } = useToastStore();
  const hasFormationData = chronicleEntries.length > 0 || ownedBooks.length > 0 || prayerItems.length > 0;
  const showStartHere = !startHereDismissed && !hasFormationData;
  const chatCollapsed = chatPreference === 'auto' ? deviceClass !== 'desktop' : chatPreference === 'collapsed';
  const chatOpen = !chatCollapsed;
  const jarvisBridge = useMemo(() => readJarvisBridge(location.search), [location.search]);
  const showJarvisBridge = jarvisBridge.active && !bridgeDismissed;

  useEffect(() => {
    setBridgeDismissed(false);
  }, [jarvisBridge.requestId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⌘N global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setNewEntryOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const text = window.getSelection?.()?.toString().trim() || '';
      if (!text) {
        closeSelectionMenu();
        return;
      }

      event.preventDefault();
      openSelectionMenu({
        open: true,
        x: Math.min(event.clientX, window.innerWidth - 240),
        y: Math.min(event.clientY, window.innerHeight - 120),
        text: text.length > 420 ? `${text.slice(0, 417)}...` : text,
      });
    };

    const handlePointerDown = () => closeSelectionMenu();
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handlePointerDown, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handlePointerDown, true);
    };
  }, [closeSelectionMenu, openSelectionMenu]);

  function dismissStartHere() {
    window.localStorage.setItem(START_HERE_DISMISSED_KEY, 'true');
    setStartHereDismissed(true);
  }

  function dismissJarvisBridge() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(JARVIS_BRIDGE_KEY);
    }
    setBridgeDismissed(true);
  }

  async function sendBackToJarvis() {
    const summary = `Sent to JARVIS from Chronicle · ${location.pathname.replace('/', '') || 'chronicle'} is ready.`;
    if (jarvisBridge.requestId) {
      try {
        await fetch('http://127.0.0.1:8787/api/router/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: jarvisBridge.requestId,
            source_system: 'chronicle',
            status: 'completed',
            summary,
            deep_link: `${window.location.origin}${location.pathname}`,
          }),
        });
      } catch {
        // Best effort only.
      }
    }

    const payload = {
      type: 'chronicle:return-to-jarvis',
      payload: {
        requestId: jarvisBridge.requestId,
        summary,
        returnPacket: jarvisBridge.returnPacket || 'chronicle',
        path: location.pathname,
        title: document.title,
      },
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
      addToast('Sent to JARVIS.', 'success', '↩');
      return;
    }

    window.open(jarvisBridge.returnUrl || 'http://127.0.0.1:8787', '_blank', 'noopener,noreferrer');
    addToast('Opened JARVIS for return handoff.', 'success', '↩');
  }

  function toggleChat() {
    setChatPreference((current) => {
      const currentlyCollapsed = current === 'auto' ? deviceClass !== 'desktop' : current === 'collapsed';
      return currentlyCollapsed ? 'expanded' : 'collapsed';
    });
  }

  function openOnboardingStep(step: (typeof CHRONICLE_ONBOARDING_STEPS)[number]) {
    if (step.path === '/settings' && step.settingsCategory) {
      navigate('/settings', { state: { requestedCategory: step.settingsCategory } });
      return;
    }
    navigate(step.path);
  }

  return (
    <div
      className={[
        s.app,
        deviceClass === 'phone' ? s.appPhone : '',
        deviceClass === 'tablet' ? s.appTablet : '',
      ].filter(Boolean).join(' ')}
      data-device-class={deviceClass}
    >
      <Sidebar deviceClass={deviceClass} />
      <div className={s.main}>
        <Topbar
          onSearch={() => setSearchOpen(true)}
          onNewEntry={() => setNewEntryOpen(true)}
          onToggleCompanion={toggleChat}
          companionOpen={chatOpen}
          deviceClass={deviceClass}
        />
        {showJarvisBridge && (
          <div className={s.jarvisBridge}>
            <div className={s.jarvisBridgeBody}>
              <div className={s.jarvisBridgeEyebrow}>Sent to Chronicle</div>
              <div className={s.jarvisBridgeTitle}>{jarvisBridge.summary}</div>
            </div>
            <div className={s.jarvisBridgeActions}>
              <button className={s.jarvisBridgeAction} type="button" onClick={sendBackToJarvis}>
                Send to JARVIS
              </button>
              <button className={s.jarvisBridgeDismiss} type="button" onClick={dismissJarvisBridge}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        {!isOnline && (
          <div className={s.runtimeBanner}>
            <div className={s.runtimeBannerBody}>
              <div className={s.runtimeBannerTitle}>You&apos;re offline.</div>
              <div className={s.runtimeBannerText}>
                Chronicle keeps local reading, notes, prayer history, and imported books available here. If you need a backup trail, create or merge a snapshot from Settings once you&apos;re back online.
              </div>
            </div>
            <button className={s.runtimeBannerAction} type="button" onClick={() => navigate('/settings', { state: { requestedCategory: 'data' } })}>
              Open Sync
            </button>
          </div>
        )}
        {showStartHere && (
          <div className={s.startHereCard}>
            <div className={s.startHereHeader}>
              <div>
                <div className={s.startHereEyebrow}>Start Here</div>
                <div className={s.startHereTitle}>Your first Chronicle loop should feel simple.</div>
              </div>
              <button className={s.startHereDismiss} type="button" onClick={dismissStartHere} aria-label="Dismiss start here guide">
                ×
              </button>
            </div>
            <div className={s.startHereIntro}>
              Open Today, study one passage, save one reflection, and create one private snapshot once you like what you see.
            </div>
            <div className={s.startHereSteps}>
              {CHRONICLE_ONBOARDING_STEPS.slice(0, 4).map((step, index) => (
                <button key={step.title} type="button" className={s.startHereStep} onClick={() => openOnboardingStep(step)}>
                  <span className={s.startHereStepIndex}>{index + 1}</span>
                  <span className={s.startHereStepText}>
                    <span className={s.startHereStepTitle}>{step.title}</span>
                    <span className={s.startHereStepDesc}>{step.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className={s.startHereTrust}>
              Chronicle is local-first. Your notes and study state save on this device as you go. Use Settings → Data & Privacy to create a portable snapshot when you want backup confidence.
            </div>
          </div>
        )}
        <div
          className={[
            s.workspace,
            deviceClass === 'phone' ? s.workspacePhone : '',
            deviceClass === 'tablet' ? s.workspaceTablet : '',
          ].filter(Boolean).join(' ')}
        >
          <div
            className={[
              s.content,
              deviceClass === 'phone' ? s.contentPhone : '',
              deviceClass === 'tablet' ? s.contentTablet : '',
            ].filter(Boolean).join(' ')}
          >
            <Outlet context={{ openNewEntry: () => setNewEntryOpen(true) }} />
          </div>
          <AIChatPanel layoutMode={deviceClass} collapsed={chatCollapsed} onToggleCollapsed={toggleChat} />
        </div>
        <footer className={s.footer}>
          <span className={s.footerText}>Primary Scripture display uses the NKJV® (© 1982 Thomas Nelson), with additional licensed sources where available.</span>
          <span className={s.footerText}>{CHRONICLE_TAGLINE}</span>
          <span className={s.footerText}>Chronicle v{CHRONICLE_APP_VERSION}</span>
        </footer>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} />
      <AISelectionMenu />
      <ToastContainer />
    </div>
  );
}
