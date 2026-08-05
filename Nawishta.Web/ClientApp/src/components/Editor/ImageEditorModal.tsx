import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconRotate,
  IconRotateClockwise,
  IconCrop,
  IconResize,
  IconRefresh,
} from '@tabler/icons-react';
import { useI18n } from '../../i18n';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ImageEditorModalProps {
  /** Whether the modal is open. */
  opened: boolean;
  /** The image source (data URL or http URL) to edit. */
  src: string;
  /** The current alt/caption text for the image. */
  alt?: string;
  /** Called with the edited image as a data URL when user applies changes. */
  onApply: (editedSrc: string, width: number, height: number, alt: string) => void;
  /** Called when user cancels. */
  onCancel: () => void;
}

type EditorMode = 'resize' | 'crop';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Image editor modal with resize, crop, and rotate capabilities.
 * Uses HTML Canvas for all image transformations — no external dependencies.
 */
export default function ImageEditorModal({
  opened,
  src,
  alt: initialAlt = '',
  onApply,
  onCancel,
}: ImageEditorModalProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Caption state
  const [caption, setCaption] = useState(initialAlt);

  // Image state
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0); // degrees: 0, 90, 180, 270
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Crop state
  const [mode, setMode] = useState<EditorMode>('resize');
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load the image when src changes
  useEffect(() => {
    if (!opened || !src) return;

    setCaption(initialAlt);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setOriginalImage(img);
      setRotation(0);
      setResizeWidth(img.naturalWidth);
      setResizeHeight(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setCropRect(null);
      setMode('resize');
    };
    img.src = src;
  }, [src, opened]);

  // Compute effective dimensions after rotation
  const getRotatedDimensions = useCallback(
    (w: number, h: number, rot: number) => {
      if (rot === 90 || rot === 270) return { width: h, height: w };
      return { width: w, height: h };
    },
    [],
  );

  // Draw the image to canvas with current transformations
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImage;
    if (!canvas || !img) return;

    const { width, height } = getRotatedDimensions(resizeWidth, resizeHeight, rotation);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Move to center, rotate, draw
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -resizeWidth / 2, -resizeHeight / 2, resizeWidth, resizeHeight);

    ctx.restore();
  }, [originalImage, rotation, resizeWidth, resizeHeight, getRotatedDimensions]);

  // Redraw whenever state changes
  useEffect(() => {
    if (opened && originalImage) {
      drawCanvas();
    }
  }, [opened, originalImage, drawCanvas]);

  // Draw crop overlay
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;

    overlay.width = canvas.width;
    overlay.height = canvas.height;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (mode === 'crop' && cropRect) {
      // Dim outside area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, overlay.width, overlay.height);

      // Clear the crop area
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

      // Draw border around crop area
      ctx.strokeStyle = '#228be6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }
  }, [mode, cropRect]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => (r + 270) % 360);
    setCropRect(null);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
    setCropRect(null);
  }, []);

  const handleWidthChange = useCallback(
    (value: string | number) => {
      const w = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(w) || w < 1) return;
      setResizeWidth(w);
      if (lockAspect) {
        setResizeHeight(Math.round(w / aspectRatio));
      }
    },
    [lockAspect, aspectRatio],
  );

  const handleHeightChange = useCallback(
    (value: string | number) => {
      const h = typeof value === 'string' ? parseInt(value, 10) : value;
      if (isNaN(h) || h < 1) return;
      setResizeHeight(h);
      if (lockAspect) {
        setResizeWidth(Math.round(h * aspectRatio));
      }
    },
    [lockAspect, aspectRatio],
  );

  const handleReset = useCallback(() => {
    if (!originalImage) return;
    setRotation(0);
    setResizeWidth(originalImage.naturalWidth);
    setResizeHeight(originalImage.naturalHeight);
    setAspectRatio(originalImage.naturalWidth / originalImage.naturalHeight);
    setCropRect(null);
  }, [originalImage]);

  // ─── Crop interaction ──────────────────────────────────────────────────────

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handleCropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'crop') return;
      const coords = getCanvasCoords(e);
      cropStartRef.current = coords;
      setIsCropping(true);
      setCropRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
    },
    [mode, getCanvasCoords],
  );

  const handleCropMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isCropping || !cropStartRef.current) return;
      const coords = getCanvasCoords(e);
      const start = cropStartRef.current;
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;

      const x = Math.max(0, Math.min(start.x, coords.x));
      const y = Math.max(0, Math.min(start.y, coords.y));
      const w = Math.min(canvas.width - x, Math.abs(coords.x - start.x));
      const h = Math.min(canvas.height - y, Math.abs(coords.y - start.y));

      setCropRect({ x, y, w, h });
    },
    [isCropping, getCanvasCoords],
  );

  const handleCropMouseUp = useCallback(() => {
    setIsCropping(false);
    cropStartRef.current = null;
  }, []);

  const applyCrop = useCallback(() => {
    if (!cropRect || cropRect.w < 5 || cropRect.h < 5) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas with the cropped region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.w;
    tempCanvas.height = cropRect.h;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      canvas,
      cropRect.x,
      cropRect.y,
      cropRect.w,
      cropRect.h,
      0,
      0,
      cropRect.w,
      cropRect.h,
    );

    // Create a new Image from the cropped canvas
    const newImg = new Image();
    newImg.onload = () => {
      imageRef.current = newImg;
      setOriginalImage(newImg);
      setResizeWidth(newImg.naturalWidth);
      setResizeHeight(newImg.naturalHeight);
      setAspectRatio(newImg.naturalWidth / newImg.naturalHeight);
      setRotation(0);
      setCropRect(null);
      setMode('resize');
    };
    newImg.src = tempCanvas.toDataURL('image/png');
  }, [cropRect]);

  // ─── Apply final result ────────────────────────────────────────────────────

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If in crop mode with a valid crop rect, apply crop first
    if (mode === 'crop' && cropRect && cropRect.w >= 5 && cropRect.h >= 5) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropRect.w;
      tempCanvas.height = cropRect.h;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        canvas,
        cropRect.x,
        cropRect.y,
        cropRect.w,
        cropRect.h,
        0,
        0,
        cropRect.w,
        cropRect.h,
      );
      onApply(tempCanvas.toDataURL('image/png'), cropRect.w, cropRect.h, caption);
    } else {
      onApply(canvas.toDataURL('image/png'), canvas.width, canvas.height, caption);
    }
  }, [mode, cropRect, onApply, caption]);

  // ─── Canvas display dimensions (fit within modal) ──────────────────────────

  const canvasDisplayStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto',
  };

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={t('imageEditorTitle')}
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Mode selector */}
        <SegmentedControl
          value={mode}
          onChange={(val) => {
            setMode(val as EditorMode);
            setCropRect(null);
          }}
          data={[
            { label: t('imageEditorResize'), value: 'resize' },
            { label: t('imageEditorCrop'), value: 'crop' },
          ]}
          fullWidth
        />

        {/* Toolbar: rotate buttons */}
        <Group justify="center" gap="sm">
          <Tooltip label={t('imageEditorRotateLeft')}>
            <ActionIcon variant="light" size="lg" onClick={handleRotateLeft} aria-label={t('imageEditorRotateLeft')}>
              <IconRotate size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('imageEditorRotateRight')}>
            <ActionIcon variant="light" size="lg" onClick={handleRotateRight} aria-label={t('imageEditorRotateRight')}>
              <IconRotateClockwise size={20} />
            </ActionIcon>
          </Tooltip>
          {mode === 'crop' && cropRect && cropRect.w >= 5 && cropRect.h >= 5 && (
            <Tooltip label={t('imageEditorCrop')}>
              <ActionIcon variant="filled" color="blue" size="lg" onClick={applyCrop} aria-label={t('imageEditorCrop')}>
                <IconCrop size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={t('imageEditorReset')}>
            <ActionIcon variant="light" color="gray" size="lg" onClick={handleReset} aria-label={t('imageEditorReset')}>
              <IconRefresh size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Resize controls */}
        {mode === 'resize' && (
          <Group gap="sm" justify="center">
            <NumberInput
              label={t('imageEditorWidth')}
              value={resizeWidth}
              onChange={handleWidthChange}
              min={1}
              max={10000}
              step={10}
              w={110}
              size="xs"
              suffix="px"
            />
            <NumberInput
              label={t('imageEditorHeight')}
              value={resizeHeight}
              onChange={handleHeightChange}
              min={1}
              max={10000}
              step={10}
              w={110}
              size="xs"
              suffix="px"
            />
            <Checkbox
              label={t('imageEditorLockAspectRatio')}
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.currentTarget.checked)}
              mt="xl"
              size="xs"
            />
          </Group>
        )}

        {/* Crop instruction */}
        {mode === 'crop' && (
          <Text size="xs" c="dimmed" ta="center">
            {t('imageEditorCropInstruction')}
          </Text>
        )}

        {/* Canvas area */}
        <Box
          style={{
            position: 'relative',
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            padding: 8,
            overflow: 'hidden',
            background: 'var(--mantine-color-gray-1)',
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <canvas ref={canvasRef} style={canvasDisplayStyle} />
          {mode === 'crop' && (
            <canvas
              ref={overlayCanvasRef}
              style={{
                ...canvasDisplayStyle,
                position: 'absolute',
                top: 8,
                left: 8,
                right: 8,
                bottom: 8,
                cursor: 'crosshair',
                width: canvasRef.current ? `${canvasRef.current.clientWidth}px` : '100%',
                height: canvasRef.current ? `${canvasRef.current.clientHeight}px` : '100%',
                maxWidth: '100%',
                maxHeight: '400px',
                margin: '0 auto',
              }}
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
            />
          )}
        </Box>

        {/* Caption/alt text */}
        <TextInput
          label={t('imageEditorCaption')}
          placeholder={t('imageEditorCaptionPlaceholder')}
          value={caption}
          onChange={(e) => setCaption(e.currentTarget.value)}
        />

        {/* Action buttons */}
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onCancel}>
            {t('imageEditorCancel')}
          </Button>
          <Button onClick={handleApply}>
            {t('imageEditorApply')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
