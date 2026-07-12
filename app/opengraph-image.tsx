import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "World Status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#14181a",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 56,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <div key={r} style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2, 3, 4, 5].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 6,
                    background: "#4fa88a",
                    opacity: 0.4 + ((r * 6 + c) % 9) * 0.07,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#e8e4d8",
            letterSpacing: "-2px",
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Server Control
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#8b948f",
            fontFamily: "monospace",
          }}
        >
          Start and monitor the server
        </div>
      </div>
    ),
    { ...size },
  );
}
