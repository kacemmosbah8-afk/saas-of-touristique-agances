import "server-only";
import QRCode from "qrcode";

/**
 * Renders `data` as an inline SVG QR code string. Generated entirely
 * server-side (no client JS, no network call) so it prints identically to
 * every other part of the voucher.
 */
export async function renderVoucherQrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#000000", light: "#0000" },
  });
}
