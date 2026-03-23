import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Deda - учимся читать по-грузински, играя.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function loadFont(fontFamily: string, text: string) {
  try {
    const cssResponse = await fetch(
      `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@700&text=${encodeURIComponent(text)}`,
    );
    if (!cssResponse.ok) {
      return null;
    }

    const css = await cssResponse.text();
    const fontUrlMatch = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype|woff2?)'\)/);
    const fontUrl = fontUrlMatch?.[1];

    if (!fontUrl) {
      return null;
    }

    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      return null;
    }

    return await fontResponse.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const catImage = await readFile(
    path.join(process.cwd(), "public/images/deda-cat.png"),
  );
  const fontData = await loadFont(
    "Noto Sans",
    "Deda — учимся читать по-грузински играя",
  );
  const catImageSrc = `data:image/png;base64,${catImage.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1020",
          color: "#f8fafc",
          fontFamily: '"Noto Sans"',
          padding: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "620px",
            height: "540px",
            borderRadius: "40px",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, #353d49 0%, #2d3541 58%, #272e39 100%)",
            boxShadow: "0 34px 104px rgba(0, 0, 0, 0.48)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              background:
                "radial-gradient(circle at 50% 24%, rgba(255, 183, 94, 0.14), transparent 32%), linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0))",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "radial-gradient(circle at 50% 30%, rgba(255, 176, 96, 0.18), transparent 36%)",
              }}
            />
            <img
              src={catImageSrc}
              alt="Deda cat"
              style={{
                width: "500px",
                height: "500px",
                objectFit: "contain",
                filter: "drop-shadow(0 20px 36px rgba(0, 0, 0, 0.28))",
              }}
            />
          </div>

        </div>
      </div>
    ),
    fontData
      ? {
          ...size,
          fonts: [
            {
              name: "Noto Sans",
              data: fontData,
              style: "normal",
              weight: 700,
            },
          ],
        }
      : size,
  );
}
