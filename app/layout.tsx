import type { Metadata } from "next";
import { Courier_Prime, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Nav } from "./Nav";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Juega online y compite por la mayor cantidad de puntos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <Nav />
          <main className="av-main">{children}</main>
          <footer
            style={{
              borderTop: "1px solid var(--line)",
              padding: "20px 32px",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
            }}
          >
            © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
          </footer>
        </div>
      </body>
    </html>
  );
}
