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
    workPackages._embedded?.elements?.map((wp: any) => {
      const projectHref = wp._links?.project?.href || "";
      const projectIdentifier = projectHref.split("/").filter(Boolean).pop() || "";

      return {
        id: wp.id,
        subject: wp.subject,
        lockVersion: wp.lockVersion,

        statusName: wp._links?.status?.title || "Bez statusu",
        statusHref: wp._links?.status?.href,

        priorityName: wp._links?.priority?.title || "Bez priority",
        priorityHref: wp._links?.priority?.href,

        assigneeName: wp._links?.assignee?.title || "Nezařazeno",
        assigneeHref: wp._links?.assignee?.href ?? null,

        projectName: wp._links?.project?.title || "Bez projektu",
        projectIdentifier,
        projectHref: wp._links?.project?.href,

        typeName: wp._links?.type?.title || "Bez typu",
        typeHref: wp._links?.type?.href,

        authorName: wp._links?.author?.title || "Neznámý autor",
        authorHref: wp._links?.author?.href,

        responsibleName: wp._links?.responsible?.title || "Bez responsible",
        responsibleHref: wp._links?.responsible?.href ?? null,
      };
    }) ?? [];

  return (
    <>
      <TopBar title="OpenProject Kanban" userName={me.name} />
      <KanbanBoard initialItems={items} initialMe={me} />
    </>
  );
}