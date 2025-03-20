import './globals.css'
import type { Metadata } from 'next'
import { Web3Provider } from '../context/Web3Context'
import Navbar from '../components/Navbar'
import { Suspense } from 'react'
import contractAddresses from '../contract-addresses.json'

export const metadata: Metadata = {
  title: 'AthleteChain - Decentralized Athlete Contract Platform',
  description: 'A decentralized platform for athletes, teams, and sponsors to manage contracts securely on the blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Suspense fallback={<div>Loading...</div>}>
          {/* 
            Web3Provider client component wrapper
            We're using a key prop with "web3" to ensure the provider is
            only mounted on the client side
          */}
          <Web3Provider factoryAddress={contractAddresses.factoryAddress}>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="bg-blue-900 text-white py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-lg font-bold">AthleteChain</h3>
                    <p className="text-blue-200 text-sm mt-1">Decentralized athlete contract management</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">&copy; {new Date().getFullYear()} AthleteChain. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </footer>
          </Web3Provider>
        </Suspense>
      </body>
    </html>
  )
}
