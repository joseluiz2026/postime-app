"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useWizard } from "./wizard-context";

// Postime Connect (future module): publishing/distribution to social channels.
// Deliberately isolated from wizard-context — Core (script/image/video/voice
// generation + download) must work with zero knowledge of any publish channel.
// This slice only tracks "is a channel connected" and "did this video get
// pushed to it", keyed by the video's own id (see Video.id in wizard-context).
// It's still mocked end-to-end (no real TikTok API call) — same "em breve"
// honesty as the non-implemented cards in the AI Provider Center.

type PublishStatus = { publishing: boolean; published: boolean };

type DistributionContextValue = {
  tiktokConnected: boolean;
  tiktokHandle: string;
  connectTiktok: (handle: string) => void;
  publishStatus: Record<string, PublishStatus>;
  publishVideo: (videoId: string) => void;
};

const DistributionContext = createContext<DistributionContextValue | null>(null);

export function DistributionProvider({ children }: { children: ReactNode }) {
  const { openModal } = useWizard();
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState("@seu.usuario");
  const [publishStatus, setPublishStatus] = useState<Record<string, PublishStatus>>({});

  const connectTiktok = useCallback((handle: string) => {
    setTiktokConnected(true);
    setTiktokHandle(handle);
  }, []);

  const publishVideo = useCallback(
    (videoId: string) => {
      if (!tiktokConnected) {
        openModal({ type: "tiktok" });
        return;
      }
      setPublishStatus((prev) => ({ ...prev, [videoId]: { publishing: true, published: false } }));
      setTimeout(() => {
        setPublishStatus((prev) => ({ ...prev, [videoId]: { publishing: false, published: true } }));
      }, 1400);
    },
    [tiktokConnected, openModal],
  );

  const value = useMemo<DistributionContextValue>(
    () => ({ tiktokConnected, tiktokHandle, connectTiktok, publishStatus, publishVideo }),
    [tiktokConnected, tiktokHandle, connectTiktok, publishStatus, publishVideo],
  );

  return <DistributionContext.Provider value={value}>{children}</DistributionContext.Provider>;
}

export function useDistribution() {
  const ctx = useContext(DistributionContext);
  if (!ctx) throw new Error("useDistribution must be used within a DistributionProvider");
  return ctx;
}
