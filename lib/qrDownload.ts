import QRCode from "qrcode";
import JSZip from "jszip";

function attendeeUrl(token: string): string {
  return `${window.location.origin}/?id=${encodeURIComponent(token)}`;
}

const QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
  width: 512,
  margin: 2,
  color: { dark: "#5C1A1A", light: "#FFFFFF" },
};

export async function downloadSingleQR(
  name: string,
  id: string,
  token: string
): Promise<void> {
  const url = attendeeUrl(token);
  const dataUrl = await QRCode.toDataURL(url, QR_OPTIONS);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `QR_${id}_${name.replace(/\s+/g, "_")}.png`;
  a.click();
}

export async function downloadAllQRs(
  attendees: { id: string; name: string; token: string }[]
): Promise<void> {
  const zip = new JSZip();
  await Promise.all(
    attendees.map(async ({ id, name, token }) => {
      const url = attendeeUrl(token);
      const dataUrl = await QRCode.toDataURL(url, QR_OPTIONS);
      const base64 = dataUrl.split(",")[1];
      zip.file(`QR_${id}_${name.replace(/\s+/g, "_")}.png`, base64, {
        base64: true,
      });
    })
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "HWB_QR_Codes.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}
