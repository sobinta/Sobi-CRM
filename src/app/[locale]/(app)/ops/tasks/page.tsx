import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listTasks } from "@/engines/tasks/task-service";
import { PageHeader } from "@/components/patterns/page-header";
import { TasksClient, type TaskRow } from "./tasks-client";

export default async function TasksPage() {
  const tasks = await withPlatformContext(() => listTasks());
  if (!tasks) notFound();

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt?.toISOString() ?? null,
    subtaskCount: t.subtasks.length,
    commentCount: t._count.comments,
  }));

  const openCount = rows.filter((t) => t.status !== "done").length;

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={`${openCount} open`}
      />
      <TasksClient tasks={rows} />
    </div>
  );
}
