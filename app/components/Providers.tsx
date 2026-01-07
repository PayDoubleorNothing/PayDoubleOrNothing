'use client'

import { WalletContextProvider } from '../providers/WalletProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider>
      {children}
    </WalletContextProvider>
  )
}
