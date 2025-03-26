import type React from "react"
import type { Metadata } from "next"
import { Inter, VT323 } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
})

const pixelFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap"
})

export const metadata: Metadata = {
  title: "PROMIXEL - Retro Pixel Art Generator",
  description: "Generate beautiful pixel art from text prompts with AI",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Inline script to handle potential errors that might break page load
              window.addEventListener('error', function(event) {
                console.error('Global error caught:', event.error);
                // Prevent complete page failure on non-critical errors
                event.preventDefault();
              });
            `,
          }}
        />
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
      <body className={`${inter.variable} ${pixelFont.variable} bg-black text-white min-h-screen`}>
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