"use client";

import { Box } from "@mui/material";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

export function MarkdownRenderer({
  raw,
  html,
}: {
  raw?: string | null;
  html?: string | null;
}) {
  const safeHtml = useMemo(() => {
    const apiHtml = html?.trim();
    if (apiHtml) {
      return DOMPurify.sanitize(apiHtml);
    }

    const src = raw?.trim();
    if (!src) return null;

    const rendered = marked.parse(src, { breaks: true }) as string;
    return DOMPurify.sanitize(rendered);
  }, [raw, html]);

  if (!safeHtml) return null;

  return (
    <Box
      sx={{
        "& h1,& h2,& h3": { mt: 2, mb: 1 },
        "& p": { mb: 1 },
        "& ul,& ol": { pl: 3, mb: 1 },
        "& code": { fontFamily: "monospace" },
        "& pre": {
          p: 1,
          borderRadius: 1,
          overflowX: "auto",
          border: "1px solid",
          borderColor: "divider",
        },
        "& blockquote": {
          pl: 2,
          borderLeft: "4px solid",
          borderColor: "divider",
          opacity: 0.9,
          my: 1,
        },
        "& a": { wordBreak: "break-word" },
      }}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}