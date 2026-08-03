import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconZoomIn, IconZoomOut } from '@tabler/icons-react';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1.0;

export interface ZoomPluginProps {
  /** Initial zoom level (1.0 = 100%). Defaults to 1.0. */
  initialZoom?: number;
  /** Callback when zoom level changes. */
  onZoomChange?: (zoom: number) => void;
}

/**
 * ZoomPlugin manages the editor content area zoom level.
 * Renders toolbar controls (+/- buttons and percentage display) and
 * registers keyboard shortcuts (Ctrl+= to zoom in, Ctrl+- to zoom out, Ctrl+0 to reset).
 */
export default function ZoomPlugin({
  initialZoom = DEFAULT_ZOOM,
  onZoomChange,
}: ZoomPluginProps) {
  const [zoom, setZoom] = useState<number>(clampZoom(initialZoom));

  const applyZoom = useCallback(
    (newZoom: number) => {
      const clamped = clampZoom(newZoom);
      setZoom(clamped);
      onZoomChange?.(clamped);
    },
    [onZoomChange],
  );

  const zoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = clampZoom(roundStep(prev + ZOOM_STEP));
      onZoomChange?.(next);
      return next;
    });
  }, [onZoomChange]);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = clampZoom(roundStep(prev - ZOOM_STEP));
      onZoomChange?.(next);
      return next;
    });
  }, [onZoomChange]);

  const resetZoom = useCallback(() => {
    applyZoom(DEFAULT_ZOOM);
  }, [applyZoom]);

  // Register keyboard shortcuts on the window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      // Ctrl+= or Ctrl+Plus (numpad) — zoom in
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
        return;
      }

      // Ctrl+- — zoom out
      if (e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Ctrl+0 — reset zoom
      if (e.key === '0') {
        e.preventDefault();
        resetZoom();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoomIn, zoomOut, resetZoom]);

  const percentage = Math.round(zoom * 100);
  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;

  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label="Zoom out (Ctrl+-)" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={zoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
        >
          <IconZoomOut size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Reset zoom (Ctrl+0)" position="bottom" withArrow>
        <Text
          size="xs"
          w={40}
          ta="center"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={resetZoom}
          aria-label={`Zoom level ${percentage}%`}
        >
          {percentage}%
        </Text>
      </Tooltip>

      <Tooltip label="Zoom in (Ctrl+=)" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={zoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
        >
          <IconZoomIn size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

/** Clamp zoom value to [MIN_ZOOM, MAX_ZOOM] */
function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/** Round a zoom value to the nearest step to avoid floating point drift */
function roundStep(value: number): number {
  return Math.round(value * 10) / 10;
}
