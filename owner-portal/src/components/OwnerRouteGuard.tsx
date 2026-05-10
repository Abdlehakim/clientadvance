import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOwnerPortal } from "./OwnerPortalProvider";
import { OwnerAccessStatusScreen } from "./OwnerAccessStatusScreen";

function buildRedirectUrl(pathname: string, search: string, hash: string) {
  const redirectTo = `${pathname}${search}${hash}`;
  return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export function OwnerRouteGuard() {
  const { authStatus } = useOwnerPortal();
  const location = useLocation();

  if (authStatus === "checking") {
    return (
      <OwnerAccessStatusScreen message={"Vérification de l’accès..."} />
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <Navigate
        replace
        to={buildRedirectUrl(location.pathname, location.search, location.hash)}
      />
    );
  }

  return <Outlet />;
}
