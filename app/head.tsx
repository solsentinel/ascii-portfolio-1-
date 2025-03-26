export default function Head() {
  return (
    <>
      <title>PROMIXEL - AI Pixel Art Generator</title>
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <meta name="description" content="Generate beautiful pixel art with AI. Simple and fast - just type a prompt and let Promixel create pixel art magic." />
      <link rel="icon" href="/favicon.ico" />
      <meta property="og:title" content="PROMIXEL - AI Pixel Art Generator" />
      <meta property="og:description" content="Generate beautiful pixel art with AI. Simple and fast - just type a prompt and let Promixel create pixel art magic." />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onerror = function(message, source, lineno, colno, error) {
              console.error("Global error caught:", { message, source, lineno, colno, error });
              return false;
            };
            window.addEventListener('unhandledrejection', function(event) {
              console.error("Unhandled promise rejection:", event.reason);
            });
          `,
        }}
      />
    </>
  );
} 