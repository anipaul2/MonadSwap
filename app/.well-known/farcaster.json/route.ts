import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    accountAssociation: {
      header: "eyJmaWQiOjE1MTA0LCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4Mzk4NjYyNDRGNGUyN0UxODZGRDAxREMyMGY1NmQzNDdFNmNCRjRjNSJ9",
      payload: "eyJkb21haW4iOiJtb25hZHN3YXAtcHNpLnZlcmNlbC5hcHAifQ",
      signature: "kdaFmMDSSXmNz5iHX0opkUF6aqxc7lXXej2AutKrXzVeVDVF5st3Uxzq0TQL0tsUbUTKqk8J/bk5oTTDNWQK1Rw="
    },
    miniapp: {
      version: "1",
      name: "MonadSwap",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: "https://miro.medium.com/v2/resize:fit:4800/format:webp/1*vsb_NQTH7xE5Y6TAfuAlNQ.jpeg",
      screenshotUrls: [],
      tags: ["monad", "dex", "swap", "defi", "kuru"],
      primaryCategory: "finance",
      buttonTitle: "🔄 Swap Tokens on Monad",
      splashImageUrl: "https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/covers/monad_cover_1740116581.webp",
      splashBackgroundColor: "#7c3aed",
      webhookUrl: "https://api.neynar.com/f/app/0266a77e-57e2-4277-a9fe-d3cb92b6ac08/event",
    },
    // For backward compatibility
    frame: {
      version: "1",
      name: "MonadSwap",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: "https://miro.medium.com/v2/resize:fit:4800/format:webp/1*vsb_NQTH7xE5Y6TAfuAlNQ.jpeg",
      screenshotUrls: [],
      tags: ["monad", "dex", "swap", "defi", "kuru"],
      primaryCategory: "finance",
      buttonTitle: "🔄 Swap Tokens on Monad",
      splashImageUrl: "https://dropsearn.fra1.cdn.digitaloceanspaces.com/media/projects/covers/monad_cover_1740116581.webp",
      splashBackgroundColor: "#7c3aed",
      webhookUrl: "https://api.neynar.com/f/app/0266a77e-57e2-4277-a9fe-d3cb92b6ac08/event",
    },
  };

  return NextResponse.json(farcasterConfig);
}
