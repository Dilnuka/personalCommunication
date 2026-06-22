export default function ConnectionBanner({ connected }) {
  if (connected) return null;

  return (
    <div className="bg-amber-500/90 text-amber-950 text-center text-sm font-medium py-2 px-4 safe-top shrink-0">
      Connection lost — trying to reconnect...
    </div>
  );
}
