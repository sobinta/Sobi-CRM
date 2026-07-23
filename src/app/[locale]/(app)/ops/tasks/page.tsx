import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listTasks } from "@/engines/tasks/task-service";
import { PageHeader } from "@/components/patterns/page-header";
import { TasksClient, type TaskRow } from "./tasks-client";

export default async function TasksPage() {
  const [tasks, t] = await Promise.all([
    withPlatformContext(() => listTasks()),
    getTranslations("ops"),
  ]);
  if (!tasks) notFound();

  const rows: TaskRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    subtaskCount: task.subtasks.length,
    commentCount: task._count.comments,
  }));

  const openCount = rows.filter((t) => t.status !== "done").length;

  return (
    <div>
      <PageHeader
        title={t("tasksTitle")}
        description={t("tasksOpenCount", { count: openCount })}
        helpTopic="operations"
      />
      <TasksClient tasks={rows} />
    </div>
  );
}
