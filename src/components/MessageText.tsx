import React, { type ReactNode } from 'react';

// Detect and suppress internal technical logs, code paths, raw JSON, and debugging traces
function isInternalDeveloperTrace(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Code paths and server filenames
  if (/code\s*path|\/server\.ts|generateDeterministicFinancialReport|\/api\/ai\//i.test(trimmed)) return true;
  // Raw backtest log rows or source objects
  if (/source\s*log\s*row|sample_backtest_logs|method_version/i.test(trimmed)) return true;
  // Raw JSON objects/arrays or JSON keys
  if (/^\s*[\{\[][\s\S]*[\}\]]\s*$/.test(trimmed) || /^\s*"(?:id|ticker|s1_technical|consensusScore|fwdReturn|netReturn|hit)"\s*:/i.test(trimmed)) return true;
  return false;
}

// Convert markdown inline tokens like **bold** and `code` into formatted React elements
function formatInline(text: string): ReactNode {
  let cleanText = text
    .replace(/\bSMA50\b/g, '50-day moving average')
    .replace(/\bSMA200\b/g, '200-day moving average')
    .replace(/\bRSI14\b/g, '14-day Relative Strength Index')
    .replace(/survivorship\s*bias/gi, 'historical survivorship bias (surviving companies only)')
    .replace(/Insufficient sample \(n\s*=\s*0\)/gi, 'Not enough historical data to evaluate performance');

  const parts = cleanText.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-[var(--bg-card)] px-1 py-0.5 font-mono text-[11px] text-emerald-400 border border-[var(--border-color)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function MessageText({ text }: { text: string }) {
  if (!text) return null;

  // If the raw text is a stringified JSON object, extract answer field
  let processedText = text;
  if (processedText.trim().startsWith('{') && processedText.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(processedText);
      if (parsed.answer) {
        processedText = parsed.answer;
      }
    } catch {
      /* not valid json */
    }
  }

  const lines = processedText.split('\n');
  const validElements: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (isInternalDeveloperTrace(rawLine)) {
      continue; // Never expose developer debug traces
    }

    const trimmed = rawLine.trim();
    if (!trimmed) {
      validElements.push(<div key={`spacer-${i}`} className="h-1.5" />);
      continue;
    }

    // Markdown H3 / H4 headers
    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      const headerText = trimmed.replace(/^#{3,4}\s+/, '');
      validElements.push(
        <h4 key={`h-${i}`} className="font-bold text-xs sm:text-sm text-emerald-400 mt-2 mb-1">
          {formatInline(headerText)}
        </h4>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[-•*]\s+/, '');
      validElements.push(
        <div key={`b-${i}`} className="flex items-start gap-2 my-0.5 pl-1 text-[var(--text-primary)]">
          <span className="text-emerald-400 select-none mt-0.5">•</span>
          <span className="flex-1">{formatInline(bulletText)}</span>
        </div>
      );
      continue;
    }

    // Standard paragraph
    validElements.push(
      <p key={`p-${i}`} className="msg-line leading-relaxed my-0.5">
        {formatInline(trimmed)}
      </p>
    );
  }

  return <div className="msg-body space-y-1 text-xs sm:text-sm leading-relaxed">{validElements}</div>;
}
