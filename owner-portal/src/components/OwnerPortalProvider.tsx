import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearOwnerSession,
  getStoredOwnerSession,
  signInOwnerSession,
  verifyOwnerSession,
} from "../services/ownerAuthService";

export type OwnerAuthStatus = "authenticated" | "checking" | "unauthenticated";

interface OwnerPortalContextValue {
  authStatus: OwnerAuthStatus;
  ownerAdminKey: string;
  signIn: (ownerAdminKey: string) => Promise<void>;
  disconnect: () => void;
}

const OwnerPortalContext = createContext<OwnerPortalContextValue | null>(null);

export function OwnerPortalProvider({ children }: { children: ReactNode }) {
  const restoredOwnerAdminKeyRef = useRef(getStoredOwnerSession());
  const [ownerAdminKey, setOwnerAdminKey] = useState(
    restoredOwnerAdminKeyRef.current,
  );
  const [authStatus, setAuthStatus] = useState<OwnerAuthStatus>(() =>
    restoredOwnerAdminKeyRef.current ? "checking" : "unauthenticated",
  );

  useEffect(() => {
    const restoredOwnerAdminKey = restoredOwnerAdminKeyRef.current;

    if (!restoredOwnerAdminKey) {
      setAuthStatus("unauthenticated");
      return;
    }

    let active = true;

    void verifyOwnerSession(restoredOwnerAdminKey)
      .then(() => {
        if (active) {
          setAuthStatus("authenticated");
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        clearOwnerSession();
        setOwnerAdminKey("");
        setAuthStatus("unauthenticated");
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<OwnerPortalContextValue>(
    () => ({
      authStatus,
      ownerAdminKey,
      async signIn(nextOwnerAdminKey: string) {
        const authenticatedKey = await signInOwnerSession(nextOwnerAdminKey);
        setOwnerAdminKey(authenticatedKey);
        setAuthStatus("authenticated");
      },
      disconnect() {
        clearOwnerSession();
        setOwnerAdminKey("");
        setAuthStatus("unauthenticated");
      },
    }),
    [authStatus, ownerAdminKey],
  );

  return (
    <OwnerPortalContext.Provider value={value}>
      {children}
    </OwnerPortalContext.Provider>
  );
}

export function useOwnerPortal() {
  const context = useContext(OwnerPortalContext);

  if (!context) {
    throw new Error("useOwnerPortal doit etre utilise dans OwnerPortalProvider.");
  }

  return context;
}
