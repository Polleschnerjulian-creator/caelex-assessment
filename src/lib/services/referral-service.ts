import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function generateReferralCode(): Promise<string> {
  return crypto.randomBytes(6).toString("base64url");
}

export async function createReferral(
  referrerUserId: string,
  referredEmail: string,
) {
  const code = await generateReferralCode();
  return prisma.referral.create({
    data: { referrerUserId, referredEmail, code },
  });
}

export async function validateReferralCode(code: string) {
  return prisma.referral.findUnique({
    where: { code },
    include: { referrer: { select: { name: true, email: true } } },
  });
}

export async function trackReferralSignup(
  code: string,
  referredUserId: string,
) {
  return prisma.referral.update({
    where: { code },
    data: { referredUserId, status: "SIGNED_UP" },
  });
}

export async function convertReferral(referredUserId: string) {
  // Called when referred user subscribes to paid plan
  const referral = await prisma.referral.findFirst({
    where: { referredUserId, status: "SIGNED_UP" },
  });
  if (!referral) return null;
  return prisma.referral.update({
    where: { id: referral.id },
    data: { status: "CONVERTED", convertedAt: new Date(), rewardGranted: true },
  });
}

export async function getUserReferrals(userId: string) {
  return prisma.referral.findMany({
    where: { referrerUserId: userId },
    orderBy: { createdAt: "desc" },
  });
}
