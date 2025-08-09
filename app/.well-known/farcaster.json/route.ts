import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    // TODO: Add your own account association
    miniapp: {
      version: "1",
      name: "MonadSwap",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: `${APP_URL}/images/feed.png`,
      screenshotUrls: [],
      tags: ["monad", "dex", "swap", "defi", "kuru"],
      primaryCategory: "defi",
      buttonTitle: "🔄 Swap Tokens",
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#7c3aed",
      webhookUrl: "https://api.neynar.com/f/app/0266a77e-57e2-4277-a9fe-d3cb92b6ac08/event",
    },
    // For backward compatibility
    frame: {
      version: "1",
      name: "MonadSwap",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: `${APP_URL}/images/feed.png`,
      screenshotUrls: [],
      tags: ["monad", "dex", "swap", "defi", "kuru"],
      primaryCategory: "defi",
      buttonTitle: "🔄 Swap Tokens",
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#7c3aed",
      webhookUrl: "https://api.neynar.com/f/app/0266a77e-57e2-4277-a9fe-d3cb92b6ac08/event",
    },
  };

  return NextResponse.json(farcasterConfig);
}
