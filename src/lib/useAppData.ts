import { useEffect, useState } from "react";
import { seedIfNeeded } from "@/services/appServices";

export function useAppData() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    seedIfNeeded();
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("gcp:data-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("gcp:data-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return tick;
}
