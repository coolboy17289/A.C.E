import React from 'react';
import { useAceStore } from '@ace/shared';
import { Window } from './Window';

/**
 * Renders every open window. Each window handles its own pointer-down
 * focusing; the desktop background itself swallows clicks via the
 * Wallpaper / launcher overlay, so there is no global "click outside to
 * unfocus" handler needed.
 */
export const WindowManager: React.FC = () => {
  const windows = useAceStore((s) => s.windows);
  return (
    <div className="absolute inset-0 z-10">
      {windows
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((w) => (
          <Window key={w.id} window={w} />
        ))}
    </div>
  );
};
