"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Muat ulang data server (router.refresh) tiap `seconds` detik selama tab terlihat. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
