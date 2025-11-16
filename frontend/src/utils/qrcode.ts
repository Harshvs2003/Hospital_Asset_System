export const generateQRCodeURL = (assetId: string) => {
  const payload = assetId || "unknown";

  const origin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "https://example.com";

  const target = `${origin}/asset/${encodeURIComponent(payload)}`;

  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(target)}`;
};
