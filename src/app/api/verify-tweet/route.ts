// API route to verify tweet content via Twitter's oEmbed endpoint
// This runs server-side to avoid CORS issues

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tweetUrl, expectedCode, expectedHandle } = await request.json();

    if (!tweetUrl || !expectedCode) {
      return NextResponse.json(
        { success: false, error: 'Missing tweet URL or verification code' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!tweetUrl.includes('/status/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid tweet URL format' },
        { status: 400 }
      );
    }

    // Normalize URL to twitter.com format for oEmbed
    let normalizedUrl = tweetUrl
      .replace('x.com', 'twitter.com')
      .replace('/i/status/', '/twitter/status/'); // Handle /i/status/ format
    
    // If using /i/status/ format, we need to construct a valid URL
    // oEmbed works better with the standard format
    if (normalizedUrl.includes('/twitter/status/')) {
      // Extract just the status ID and use a generic format
      const statusMatch = tweetUrl.match(/status\/(\d+)/);
      if (statusMatch) {
        normalizedUrl = `https://twitter.com/i/status/${statusMatch[1]}`;
      }
    }

    // Fetch tweet via oEmbed endpoint (public, no API key needed)
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true`;
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenColosseum/1.0)',
      },
    });

    if (!response.ok) {
      // If oEmbed fails, try with the original URL format
      const altOembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
      const altResponse = await fetch(altOembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenColosseum/1.0)',
        },
      });
      
      if (!altResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Could not fetch tweet. Make sure the tweet is public and the URL is correct.' },
          { status: 400 }
        );
      }
      
      const altData = await altResponse.json();
      return verifyTweetContent(altData, expectedCode, expectedHandle);
    }

    const data = await response.json();
    return verifyTweetContent(data, expectedCode, expectedHandle);

  } catch (error) {
    console.error('Tweet verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

function verifyTweetContent(
  data: { html?: string; author_name?: string },
  expectedCode: string,
  expectedHandle?: string
) {
  const tweetHtml = data.html || '';
  const authorName = data.author_name || '';

  // Check if the verification code is in the tweet
  if (!tweetHtml.includes(expectedCode)) {
    return NextResponse.json(
      { success: false, error: `Tweet doesn't contain the verification code: ${expectedCode}` },
      { status: 400 }
    );
  }

  // Check if it mentions Open Colosseum (flexible matching)
  const mentionsColosseum = tweetHtml.toLowerCase().includes('opencolosseum') ||
                           tweetHtml.toLowerCase().includes('open colosseum') ||
                           tweetHtml.toLowerCase().includes('colosseum');
  if (!mentionsColosseum) {
    return NextResponse.json(
      { success: false, error: 'Tweet must mention Open Colosseum' },
      { status: 400 }
    );
  }

  // Optional: verify handle matches (if provided)
  if (expectedHandle && authorName) {
    const handleMatches = authorName.toLowerCase() === expectedHandle.toLowerCase() ||
                         tweetHtml.toLowerCase().includes(expectedHandle.toLowerCase());
    // We don't fail on handle mismatch, just log it
    if (!handleMatches) {
      console.log(`Handle mismatch: expected ${expectedHandle}, got ${authorName}`);
    }
  }

  return NextResponse.json({
    success: true,
    authorName,
    message: 'Tweet verified successfully!'
  });
}
