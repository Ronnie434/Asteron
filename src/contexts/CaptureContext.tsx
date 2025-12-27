import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CaptureContextType {
  isCaptureOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
}

const CaptureContext = createContext<CaptureContextType | undefined>(undefined);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  const openCapture = useCallback(() => {
    setIsCaptureOpen(true);
  }, []);

  const closeCapture = useCallback(() => {
    setIsCaptureOpen(false);
  }, []);

  return (
    <CaptureContext.Provider value={{ isCaptureOpen, openCapture, closeCapture }}>
      {children}
    </CaptureContext.Provider>
  );
}

export function useCapture(): CaptureContextType {
  const context = useContext(CaptureContext);
  if (context === undefined) {
    throw new Error('useCapture must be used within a CaptureProvider');
  }
  return context;
}
