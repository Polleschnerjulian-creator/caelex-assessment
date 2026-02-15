import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentViewClient } from "./client";

export const dynamic = "force-dynamic";

export default async function GeneratedDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const doc = await prisma.generatedDocument.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!doc) redirect("/dashboard/documents");

  const sections =
    doc.isEdited && doc.editedContent
      ? (doc.editedContent as unknown[])
      : doc.content
        ? (doc.content as unknown[])
        : [];

  return (
    <DocumentViewClient
      id={doc.id}
      title={doc.title}
      documentType={doc.documentType}
      status={doc.status}
      sections={JSON.parse(JSON.stringify(sections))}
      createdAt={doc.createdAt.toISOString()}
      modelUsed={doc.modelUsed}
    />
  );
}
