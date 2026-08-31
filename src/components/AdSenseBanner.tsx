import React, { useEffect, useRef } from "react";

interface AdSenseBannerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  responsive?: boolean;
  className?: string;
  label?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slot,
  format = "auto",
  responsive = true,
  className = "",
  label = true,
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    // Only push once when the element is mounted and not yet filled
    if (isLoadedRef.current) return;

    try {
      if (typeof window !== "undefined" && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoadedRef.current = true;
      }
    } catch (err) {
      console.warn("AdSense push notice:", err);
    }
  }, []);

  return (
    <div
      id="adsense-container"
      className={`relative w-full overflow-hidden rounded-2xl bg-[#181818]/60 border border-white/5 p-2 my-4 text-center transition-all ${className}`}
    >
      {label && (
        <div className="flex items-center justify-between px-2 pb-1 text-[10px] text-zinc-500 font-medium tracking-wider uppercase">
          <span>Annonce</span>
          <span className="text-[9px] text-zinc-600">Google Ads</span>
        </div>
      )}
      <div className="flex items-center justify-center min-h-[60px] overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", minHeight: "60px", width: "100%" }}
          data-ad-client="ca-pub-4546853652922046"
          data-ad-slot={slot || undefined}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </div>
  );
};
