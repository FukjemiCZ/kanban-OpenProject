import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUser, getWorkPackages } from "@/lib/openproject";
import { TopBar } from "@/components/TopBar";
import { KanbanBoard } from "@/components/KanbanBoard";

type BoardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const sp = (await searchParams) ?? {};

  const session = await getSession();
  if (!session?.accessToken) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(sp)) {
      if (Array.isArray(value)) {
        for (const v of value) if (v != null) params.append(key, String(v));
      } else if (value != null) {
        params.set(key, String(value));
      }
    }

    const returnTo = `/board${params.toString() ? `?${params.toString()}` : ""}`;
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const [me, workPackages] = await Promise.all([
    getCurrentUser(session.accessToken),
    getWorkPackages(session.accessToken, 100),
  ]);

  const items =
    workPackages._embedded?.elements?.map((wp) => {
      const projectHref = wp._links?.project?.href || "";
      const projectIdentifier = projectHref.split("/").filter(Boolean).pop() || "";

      return {
        id: wp.id,
        subject: wp.subject,
        statusName: wp._links?.status?.title || "Bez statusu",
        priorityName: wp._links?.priority?.title || "Bez priority",
        assigneeName: wp._links?.assignee?.title || "Nezařazeno",
        projectName: wp._links?.project?.title || "Bez projektu",
        projectIdentifier,
        typeName: wp._links?.type?.title || "Bez typu",
        authorName: wp._links?.author?.title || "Neznámý autor",
        responsibleName: wp._links?.responsible?.title || "Bez responsible",
      };
    }) ?? [];

  return (
    <>
      <TopBar title="OpenProject Kanban" userName={me.name} />
      <KanbanBoard initialItems={items} />
    </>
  );
}