import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeScript from "@/components/ThemeScript";
import ReduxProvider from "@/store/provider";
import InitAuthLoader from "@/store/InitAuthLoader";
import CallSocketHandler from "@/components/dm/call/CallSocketHandler";
import CallIncomingToast from "@/components/dm/call/CallIncomingToast";
import ModalProvider from "@/components/ModalProvider";
import WebRTCConnectionHandler from "@/components/dm/call/WebRTCConnectionHandler";

export const metadata: Metadata = {
  title: "Oh! Sori",
  description: "커뮤니티 보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-black dark:bg-zinc-900 dark:text-zinc-100 font-pretendard min-h-screen">
        <ReduxProvider>
          <InitAuthLoader>
            <ThemeToggle />
            <ModalProvider />
            <CallSocketHandler />
            <CallIncomingToast />
            <WebRTCConnectionHandler />
            <audio id="remoteAudio" autoPlay playsInline className="hidden" />
            {children}
          </InitAuthLoader>
        </ReduxProvider>
      </body>
    </html>
  );
}
