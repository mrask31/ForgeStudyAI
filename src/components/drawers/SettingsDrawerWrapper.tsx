'use client';

import { useEffect, useState } from 'react';
import { SettingsDrawer } from './SettingsDrawer';

/**
 * Wrapper component that listens for the 'open-settings-drawer' custom event
 * and manages the SettingsDrawer state globally.
 */
export function SettingsDrawerWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setIsOpen(true);
    window.addEventListener('open-settings-drawer', handleOpenSettings);
    return () => window.removeEventListener('open-settings-drawer', handleOpenSettings);
  }, []);

  return (
    <SettingsDrawer 
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
