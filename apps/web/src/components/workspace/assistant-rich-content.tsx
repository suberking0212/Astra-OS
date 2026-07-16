"use client";

import { Check, Copy } from "lucide-react";
import { isValidElement, type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type AssistantRichContentProps = {
  content: string;
};

type PreBlockProps = {
  children?: ReactNode;
};

type TableBlockProps = {
  children?: ReactNode;
};

type MarkdownImageProps = {
  src?: string | Blob;
  alt?: string;
};

type MarkdownSpanProps = {
  className?: string;
  children?: ReactNode;
};

function extractTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractTextContent).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTextContent(node.props.children);
  }

  return "";
}

function normalizeCopiedText(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

type CopyButtonProps = {
  getValue: () => string;
  label?: string;
};

function CopyButton({ getValue, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const value = normalizeCopiedText(getValue());
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy rich content block.", error);
    }
  }, [getValue]);

  return (
    <button className="assistant-copy-button" type="button" onClick={() => void handleCopy()}>
      {copied ? <Check className="icon" aria-hidden="true" /> : <Copy className="icon" aria-hidden="true" />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

type CopyableBlockProps = {
  children: ReactNode;
  copyValue: () => string;
  className?: string;
  buttonLabel?: string;
};

function CopyableBlock({ children, copyValue, className, buttonLabel }: CopyableBlockProps) {
  return (
    <div className={className ? `assistant-copyable-block ${className}` : "assistant-copyable-block"}>
      <div className="assistant-copyable-content">{children}</div>
      <div className="assistant-copyable-actions">
        <CopyButton getValue={copyValue} label={buttonLabel} />
      </div>
    </div>
  );
}

function PreBlock({ children }: PreBlockProps) {
  const code = extractTextContent(children);
  return (
    <CopyableBlock copyValue={() => code} className="assistant-copyable-pre" buttonLabel="Copy code">
      <pre>{children}</pre>
    </CopyableBlock>
  );
}

function TableBlock({ children }: TableBlockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <CopyableBlock
      copyValue={() => containerRef.current?.innerText ?? ""}
      className="assistant-copyable-table"
      buttonLabel="Copy table"
    >
      <div className="assistant-table-scroll" ref={containerRef}>
        <table>{children}</table>
      </div>
    </CopyableBlock>
  );
}

function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const imageSource = typeof src === "string" ? src : "";
  const markdownImage = alt ? `![${alt}](${imageSource})` : imageSource;
  return (
    <CopyableBlock copyValue={() => markdownImage} className="assistant-copyable-image" buttonLabel="Copy image">
      {/* Keep markdown images readable and bounded inside the prose column. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSource} alt={alt ?? ""} />
    </CopyableBlock>
  );
}

function MarkdownSpan({ className, children }: MarkdownSpanProps) {
  const mathRef = useRef<HTMLDivElement | null>(null);

  if (className?.includes("katex-display")) {
    return (
      <CopyableBlock
        copyValue={() =>
          mathRef.current?.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
          mathRef.current?.innerText ??
          ""
        }
        className="assistant-copyable-formula"
        buttonLabel="Copy formula"
      >
        <div className={className} ref={mathRef}>
          {children}
        </div>
      </CopyableBlock>
    );
  }

  return <span className={className}>{children}</span>;
}

export function AssistantRichContent({ content }: AssistantRichContentProps) {
  const components = useMemo<Components>(
    () => ({
      pre: PreBlock,
      table: TableBlock,
      img: MarkdownImage,
      span: MarkdownSpan,
    }),
    [],
  );

  return (
    <div className="assistant-rich-content">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
