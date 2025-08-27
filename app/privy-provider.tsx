"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { monadTestnet } from "viem/chains";

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        appearance: {
          loginMessage: "Monad Games ID Game",
        },
        loginMethodsAndOrder: {
          primary: ["privy:cmd8euall0037le0my79qpz42"],
        },
        supportedChains: [monadTestnet],
        defaultChain: monadTestnet,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
