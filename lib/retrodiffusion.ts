// RetroFusion API integration
// This is a placeholder for the actual API integration

export interface PixelArtResponse {
  imageUrl: string;
  pixelArtAscii?: string;
  prompt?: string;
  message?: string;
  remainingCredits?: number;
  error?: string;
}

export async function generatePixelArt(prompt: string): Promise<PixelArtResponse> {
  console.log(`Generating pixel art for prompt: "${prompt}"`);

  try {
    const response = await fetch('/api/retrodiffusion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to generate pixel art:', { 
        status: response.status, 
        statusText: response.statusText,
        response: errorText
      });
      
      let errorMessage = `Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If we can't parse the error as JSON, use the status text
      }
      
      return {
        imageUrl: `https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Error:+${response.status}`,
        message: errorMessage,
        prompt,
      };
    }

    const data = await response.json();
    
    // Log the response structure for debugging
    console.log('Pixel art generation response:', {
      hasImageUrl: !!data.imageUrl,
      imageUrlLength: data.imageUrl ? data.imageUrl.length : 0,
      keys: Object.keys(data)
    });

    if (!data.imageUrl) {
      console.error('Missing imageUrl in API response');
      return {
        imageUrl: 'https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Missing+Image+URL',
        message: 'API response did not include an image URL',
        prompt,
      };
    }

    // Validate that the imageUrl is a valid base64 image
    if (data.imageUrl.startsWith('data:image')) {
      const base64Part = data.imageUrl.split(',')[1];
      if (base64Part) {
        try {
          // This will throw an error if the base64 is invalid
          atob(base64Part);
        } catch (e) {
          console.error('Invalid base64 in image URL:', e);
          return {
            imageUrl: 'https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Invalid+Image+Data',
            message: 'The image data received was invalid',
            prompt,
          };
        }
      }
    }

    return {
      imageUrl: data.imageUrl,
      pixelArtAscii: data.pixelArtAscii || '',
      prompt: data.prompt || prompt,
      message: data.message,
      remainingCredits: data.remainingCredits,
    };
  } catch (error) {
    console.error('Error generating pixel art:', error);
    return {
      imageUrl: 'https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Error',
      message: error instanceof Error ? error.message : 'Failed to generate pixel art',
      prompt,
    };
  }
}

// Function to generate placeholder ASCII art
function generatePlaceholderAsciiArt(prompt: string): string {
  if (!prompt) {
    return "";
  }
  
  const patterns = [
    `
■■■■■■■■■■■■■■■■
■                ■
■  ♥♥      ♥♥   ■
■  ♥♥      ♥♥   ■
■                ■
■       ♥♥       ■
■      ♥♥♥♥      ■
■       ♥♥       ■
■                ■
■■■■■■■■■■■■■■■■
    `,
    `
□□□□□□□□□□□□□□□□
□  ▓▓▓▓▓▓▓▓▓▓  □
□  ▓        ▓  □
□  ▓  ◘  ◘  ▓  □
□  ▓        ▓  □
□  ▓   ⌣    ▓  □
□  ▓        ▓  □
□  ▓▓▓▓▓▓▓▓▓▓  □
□□□□□□□□□□□□□□□□
    `,
    `
╔════════════╗
║ ▄▄▄    ▄▄▄ ║
║ █▀█    █▀█ ║
║            ║
║    ╭──╮    ║
║    ╰──╯    ║
║            ║
╚════════════╝
    `,
    `
┌──────────────┐
│   ╭─╮  ╭─╮   │
│   ╰─╯  ╰─╯   │
│              │
│      /\\     │
│     /  \\    │
│    /____\\   │
└──────────────┘
    `
  ];
  
  // Pick a pattern based on the prompt (just for demonstration)
  const index = Math.floor(prompt.length % patterns.length);
  return patterns[index];
}

// Function to download the generated image
export async function downloadPixelArt(imageUrl: string, filename = 'pixel-art.png'): Promise<void> {
  if (!imageUrl) {
    console.error('No image URL provided for download');
    throw new Error('No image URL provided for download');
  }

  try {
    // For data URLs, we can directly create a download link
    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For remote URLs, we need to fetch the image first
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading pixel art:', error);
    throw new Error('Failed to download image');
  }
} 