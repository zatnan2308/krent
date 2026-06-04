export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }}
    >
      <span
        role="status"
        aria-label="Loading"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "2px solid var(--border-medium)",
          borderTopColor: "var(--accent)",
          animation: "edSpin 700ms linear infinite",
        }}
      />
      <style>{`@keyframes edSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
