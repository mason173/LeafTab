import React from 'react';

export function buildAbsoluteGridItemStyle(params: {
  left: number;
  top: number;
  width: number;
  height: number;
}): React.CSSProperties {
  return {
    left: params.left,
    top: params.top,
    width: params.width,
    height: params.height,
  };
}

export function renderShortcutSelectionOverlay(content: React.ReactNode) {
  if (!content) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 rounded-xl"
      aria-hidden="true"
    >
      {content}
    </div>
  );
}

export function renderGridItemPlaceholder(style: { width: number; height: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none"
      style={style}
    />
  );
}
