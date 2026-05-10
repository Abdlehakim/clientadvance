export function OwnerAccessStatusScreen({ message }: { message: string }) {
  return (
    <div className="auth-screen">
      <div className="auth-card auth-card--compact">
        <div className="auth-kicker">{"Espace propriétaire"}</div>
        <h1 className="auth-title">{message}</h1>
      </div>
    </div>
  );
}
