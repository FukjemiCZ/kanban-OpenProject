import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getCurrentUser,
  getWorkPackages,
  isOpenProjectUnauthenticatedError,
} from "@/lib/openproject";
import { getStatuses, buildStatusColorMap } from "@/lib/openproject-statuses";
import { TopBar } from "@/components/TopBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

type BoardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildReturnTo(sp: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) {
      for (const v of value) if (v != null) params.append(key, String(v));
    } else if (value != null) {
      params.set(key, String(value));
    }
  }
  return `/board${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const sp = (await searchParams) ?? {};
  const returnTo = buildReturnTo(sp);

  const session = await getSession();
  if (!session?.accessToken) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  try {
    const [me, workPackages, statuses] = await Promise.all([
      getCurrentUser(session.accessToken),
      getWorkPackages(session.accessToken, 100),
      getStatuses(session.accessToken),
    ]);

    const statusColorMap = buildStatusColorMap(statuses);

    const items =
      workPackages._embedded?.elements?.map((wp: any) => {
        const statusHref = wp._links?.status?.href ?? null;
        const statusColor = statusHref ? statusColorMap.get(statusHref) ?? null : null;

        const projectHref = wp._links?.project?.href || "";
        const projectIdentifier = projectHref.split("/").filter(Boolean).pop() || "";

        return {
          id: wp.id,
          subject: wp.subject,
          lockVersion: wp.lockVersion,

          statusName: wp._links?.status?.title || "Bez statusu",
          statusHref,
          statusColor, // ✅ přidáno

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
        <TopBar title="Kanban" userName={me?.name ?? "Me"} />
        <KanbanBoard initialItems={items} />
      </>
    );
  } catch (e) {
    if (isOpenProjectUnauthenticatedError(e)) {
      redirect(
        `/api/auth/logout?returnTo=${encodeURIComponent(
          `/login?returnTo=${encodeURIComponent(returnTo)}`
        )}`
      );
    }
    throw e;
  }
}