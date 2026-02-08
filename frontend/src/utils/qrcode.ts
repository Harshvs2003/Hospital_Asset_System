export const generateQRCodeURL = (assetId: string) => {
  const payload = assetId || "unknown";

  const envOrigin =
    typeof import.meta !== "undefined" && (import.meta as any).env
      ? (import.meta as any).env.VITE_PUBLIC_APP_URL
      : null;

  const origin =
    envOrigin ||
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "https://example.com";

  const target = `${origin}/assets/${encodeURIComponent(payload)}`;

  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(target)}`;
};
