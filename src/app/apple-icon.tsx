import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function Icon() {
  const logoData = await fetch(
    new URL("../public/images/logo-white.png", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        borderRadius: "36px",
      }}
    >
      <img src={logoData as unknown as string} width={108} height={108} />
    </div>,
    { ...size },
  );
}
