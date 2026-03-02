"use client";

import { Box, Typography } from "@mui/material";
import DOMPurify, { type Config } from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

let hooksInstalled = false;

function sanitizeHtml(dirty: string) {
  const purifyConfig: Config = {
    ADD_TAGS: ["input"],
    ADD_ATTR: ["type", "checked", "disabled"],
  };

  if (!hooksInstalled) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node instanceof HTMLAnchorElement) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }

      if (node instanceof HTMLInputElement && node.type === "checkbox") {
        node.setAttribute("disabled", "");
      }
    });

    hooksInstalled = true;
  }

  return String(DOMPurify.sanitize(dirty, purifyConfig));
}

export function MarkdownRenderer({
  raw,
  html,
}: {
  raw?: string | null;
  html?: string | null;
}) {
  const out = useMemo(() => {
    const src = raw?.trim();
    if (src) {
      const rendered = marked.parse(src, {
        gfm: true,
        breaks: true,
      }) as string;

      const sanitized = sanitizeHtml(rendered);
      if (sanitized.trim()) return { kind: "html" as const, value: sanitized };
      return { kind: "text" as const, value: src };
    }

    const apiHtml = html?.trim();
    if (apiHtml) {
      const sanitized = sanitizeHtml(apiHtml);
      if (sanitized.trim()) return { kind: "html" as const, value: sanitized };
      return { kind: "text" as const, value: apiHtml };
    }

    return { kind: "empty" as const, value: "" };
  }, [raw, html]);

  if (out.kind === "empty") return null;

  if (out.kind === "text") {
    return (
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {out.value}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        "& p": { my: 1 },
        "& ul, & ol": { pl: 3, my: 1 },
        "& li": { my: 0.5 },

        "& a": { textDecoration: "underline", wordBreak: "break-word" },

        "& pre": { overflowX: "auto", p: 1.5, borderRadius: 1, bgcolor: "action.hover" },
        "& code": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },

        "& blockquote": {
          borderLeft: "4px solid",
          borderColor: "divider",
          pl: 2,
          ml: 0,
          color: "text.secondary",
        },

        "& img": { maxWidth: "100%", height: "auto" },

        "& input[type='checkbox']": {
          marginRight: "0.5rem",
          transform: "translateY(2px)",
          pointerEvents: "none",
        },
      }}
      dangerouslySetInnerHTML={{ __html: out.value }}
    />
  );
}