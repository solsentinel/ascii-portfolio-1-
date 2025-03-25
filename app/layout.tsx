import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Promixel | Pixel Art Generator",
  description: "Generate beautiful pixel art using AI",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <style>
          {`
            :root {
              --font-global: var(--font-pixel);
            }
            
            * {
              font-family: var(--font-pixel), monospace;
            }
            
            input, textarea, .font-mono {
              font-family: var(--font-mono), monospace;
            }
            
            .font-sans {
              font-family: var(--font-pixel), monospace;
            }
          `}
        </style>
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${pressStart2P.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme="dark"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'