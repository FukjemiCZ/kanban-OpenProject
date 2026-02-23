export type HalLink = { href: string; title?: string };

export type OpenProjectUser = {
  id: number;
  _type: "User";
  name: string;
  login?: string;
  email?: string;
};

export type OpenProjectWorkPackage = {
  id: number;
  subject: string;
  _type: "WorkPackage";
  description?: {
    format?: string;
    raw?: string;
    html?: string;
  } | null;
  startDate?: string | null;
  dueDate?: string | null;
  percentageDone?: number | null;
  lockVersion?: number;
  _links?: {
    self?: HalLink;
    status?: HalLink;
    assignee?: HalLink | null;
    project?: HalLink;
    priority?: HalLink;
    type?: HalLink;
    author?: HalLink;
    responsible?: HalLink | null;
    version?: HalLink | null;
  };
};

export type OpenProjectCollection<T> = {
  _type: "Collection";
  total: number;
  count: number;
  _embedded?: {
    elements?: T[];
  };
};