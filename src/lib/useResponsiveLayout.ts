import { useEffect, useState } from 'react';

export type ChronicleDeviceClass = 'phone' | 'tablet' | 'desktop';

function getHasCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function getViewportWidth() {
  if (typeof window === 'undefined') return 1280;
  return window.innerWidth;
}

function getDeviceClass(viewportWidth: number): ChronicleDeviceClass {
  if (viewportWidth <= 760) return 'phone';
  if (viewportWidth <= 1180) return 'tablet';
  return 'desktop';
}

export function useResponsiveLayout() {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(getHasCoarsePointer);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(getViewportWidth());
      setHasCoarsePointer(getHasCoarsePointer());
    };

    window.addEventListener('resize', handleResize);

    const pointerQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)')
      : null;
    const handlePointerChange = () => setHasCoarsePointer(getHasCoarsePointer());
    pointerQuery?.addEventListener?.('change', handlePointerChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      pointerQuery?.removeEventListener?.('change', handlePointerChange);
    };
  }, []);

  const deviceClass = getDeviceClass(viewportWidth);

  return {
    viewportWidth,
    deviceClass,
    isDesktop: deviceClass === 'desktop',
    isTablet: viewportWidth <= 1180,
    isCompact: viewportWidth <= 1024,
    isPhone: viewportWidth <= 760,
    hasCoarsePointer,
    aiPanelMode: deviceClass === 'desktop' ? 'rail' : deviceClass === 'tablet' ? 'drawer' : 'sheet',
    sidebarMode: deviceClass === 'phone' ? 'stacked' : deviceClass === 'tablet' ? 'compact-rail' : 'rail',
  };
}
