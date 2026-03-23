import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Deda - учимся читать по-грузински, играя.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const catImage = await readFile(
    path.join(process.cwd(), "public/images/deda-cat.png"),
  );
  const fontData = await readFile(
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
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
          fontFamily: '"Arial Unicode"',
          padding: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "500px",
            height: "560px",
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
                width: "468px",
                height: "468px",
                objectFit: "contain",
                filter: "drop-shadow(0 20px 36px rgba(0, 0, 0, 0.28))",
                marginTop: "-82px",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "0 32px 58px",
              marginTop: "-108px",
              background:
                "linear-gradient(180deg, rgba(39, 45, 56, 0), rgba(36, 41, 51, 0.82) 24%, #242933 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "33px",
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                maxWidth: "420px",
              }}
            >
              Deda — учимся читать по-грузински играя
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Arial Unicode",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
