import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "PsychVault";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType ="image/png";

export default function OpenGraphImage() {
  const logoData = readFileSync(join(process.cwd(), "public", "logo-PNG.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display:"flex",
          height:"100%",
          width:"100%",
          background:
"linear-gradient(135deg, #f7efe2 0%, #eddcc5 45%, #e2cdb2 100%)",
          color:"#3f2d1f",
          fontFamily:"Arial",
          position:"relative",
          overflow:"hidden",
        }}
      >
        <div
          style={{
            position:"absolute",
            inset: 0,
            background:
"radial-gradient(circle at top left, rgba(150, 103, 67, 0.18), transparent 35%), radial-gradient(circle at bottom right, rgba(110, 72, 45, 0.12), transparent 34%)",
          }}
        />
        <div
          style={{
            display:"flex",
            flexDirection:"column",
            justifyContent:"space-between",
            padding:"64px",
            width:"100%",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display:"flex",
              alignItems:"center",
              gap:"16px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoBase64}
              width={76}
              height={76}
              alt="PsychVault logo"
              style={{ objectFit: "contain" }}
            />
            <div
              style={{
                display:"flex",
                flexDirection:"column",
              }}
            >
              <div
                style={{
                  fontSize:"18px",
                  letterSpacing:"0.25em",
                  textTransform:"uppercase",
                  color:"#7e624c",
                }}
              >
                Psychology Marketplace
              </div>
              <div
                style={{
                  fontSize:"46px",
                  fontWeight: 700,
                }}
              >
                PsychVault
              </div>
            </div>
          </div>

          <div
            style={{
              display:"flex",
              flexDirection:"column",
              gap:"18px",
              maxWidth:"860px",
            }}
          >
            <div
              style={{
                fontSize:"64px",
                lineHeight: 1.05,
                fontWeight: 700,
              }}
            >
              Resources designed by clinicians, for real practice
            </div>
            <div
              style={{
                fontSize:"28px",
                lineHeight: 1.35,
                color:"#624936",
              }}
            >
              Discover worksheets, report templates, psychoeducation, and practical tools
              from psychology creators across Australia.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
