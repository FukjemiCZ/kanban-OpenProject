import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUser, getWorkPackages } from "@/lib/openproject";
import { TopBar } from "@/components/TopBar";
import { KanbanBoard } from "@/components/KanbanBoard";

export default async function BoardPage() {
  const session = await getSession();
  if (!session?.accessToken) redirect("/login");

  const [me, workPackages] = await Promise.all([
    getCurrentUser(session.accessToken),
    getWorkPackages(session.accessToken, 100),
  ]);

  const items =
    workPackages._embedded?.elements?.map((wp) => {
      const projectHref = wp._links?.project?.href || "";
      // typicky /api/v3/projects/{idOrIdentifier}
      const projectIdentifier = projectHref.split("/").filter(Boolean).pop() || "";

      return {
        id: wp.id,
        subject: wp.subject,

        statusName: wp._links?.status?.title || "Bez statusu",
        priorityName: wp._links?.priority?.title || "Bez priority",
        assigneeName: wp._links?.assignee?.title || "Nezařazeno",
        projectName: wp._links?.project?.title || "Bez projektu",
        projectIdentifier, // <- NOVÉ (pro URL routing filtr)
        typeName: wp._links?.type?.title || "Bez typu",
        authorName: wp._links?.author?.title || "Neznámý autor",
        responsibleName: wp._links?.responsible?.title || "Bez responsible",
      };
    }) ?? [];

  return (
    <main>
      <TopBar title="Modern Kanban (OpenProject MVP)" userName={me.name} />
      <KanbanBoard initialItems={items} initialMe={{ name: me.name }} />
    </main>
  );
}
