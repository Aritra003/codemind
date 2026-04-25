import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { ReportData, Severity } from "@/lib/reporter";
import { ReportClient } from "./client";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;
  const report = await db.report.findFirst({ where: { id: params.id, userId } });
  if (!report) notFound();
  const data: ReportData = JSON.parse(report.data);
  return <ReportClient data={data} createdAt={report.createdAt.toISOString()} />;
}
