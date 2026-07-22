import QRCode from "qrcode";

/**
 * Renders a QR code locally as a data: URL — never call out to a third-party
 * QR image service for this, since the encoded URL carries the contract's
 * unguessable share token.
 */
export async function contractQrDataUrl(publicUrl: string): Promise<string> {
  return QRCode.toDataURL(publicUrl, {
    margin: 1,
    width: 176,
    color: { dark: "#12312a", light: "#00000000" },
  });
}
