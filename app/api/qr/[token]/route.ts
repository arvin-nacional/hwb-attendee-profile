import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/baseUrl";

const QR_OPTIONS: QRCode.QRCodeToBufferOptions = {
  type: "png",
  width: 512,
  margin: 2,
  color: { dark: "#5C1A1A", light: "#FFFFFF" },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const profileUrl = `${getBaseUrl()}/?id=${encodeURIComponent(token)}`;

  try {
    const buffer = await QRCode.toBuffer(profileUrl, QR_OPTIONS);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return new NextResponse("Failed to generate QR code", { status: 500 });
  }
}
