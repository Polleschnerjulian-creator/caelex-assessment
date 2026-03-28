import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWorkflowStatus,
  getAvailableWorkflows,
} from "@/lib/astra/guided-workflows.server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("id");

    if (workflowId) {
      const workflow = await getWorkflowStatus(workflowId, session.user.id);
      if (!workflow)
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 },
        );
      return NextResponse.json({ data: { workflow } });
    }

    return NextResponse.json({ data: { workflows: getAvailableWorkflows() } });
  } catch (error) {
    console.error("[astra-workflows]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
