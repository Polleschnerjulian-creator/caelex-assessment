import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Machine-readable security contact per RFC 9116.
 *
 * When you change anything here, also bump the "Expires" field; a past
 * Expires makes the file invalid for scanners that enforce the RFC.
 */
export function GET() {
  const lines = [
    "Contact: mailto:security@caelex.eu",
    "Expires: 2027-04-18T00:00:00.000Z",
    "Preferred-Languages: de, en",
    "Canonical: https://caelex.eu/.well-known/security.txt",
    "Policy: https://caelex.eu/legal/security",
    "Acknowledgments: https://caelex.eu/legal/security#hall-of-fame",
    "",
  ];
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
