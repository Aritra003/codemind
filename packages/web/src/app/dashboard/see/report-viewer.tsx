"use client";
import { Download, RotateCcw } from "lucide-react";

type Block =
  | { kind: "h2";      text: string }
  | { kind: "h3";      text: string }
  | { kind: "bullet";  text: string }
  | { kind: "numbered"; text: string; n: number }
  | { kind: "para";    text: string }
  | { kind: "rule" }

function parseReport(raw: string): Block[] {
  const blocks: Block[] = [];
  let numIdx = 0;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("## "))      { blocks.push({ kind: "h2", text: t.slice(3) }); numIdx = 0; }
    else if (t.startsWith("### ")) blocks.push({ kind: "h3", text: t.slice(4) });
    else if (t.match(/^---+$/))    blocks.push({ kind: "rule" });
    else if (t.match(/^[-•*] /))   blocks.push({ kind: "bullet", text: t.slice(2) });
    else if (t.match(/^\d+\.\s/))  blocks.push({ kind: "numbered", text: t.replace(/^\d+\.\s/, ""), n: ++numIdx });
    else                           blocks.push({ kind: "para", text: t });
  }
  return blocks;
}

function inline(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, "<strong class='text-ink font-semibold'>$1</strong>")
    .replace(/`(.+?)`/g, "<code class='font-mono text-brand text-[11px] bg-brand/8 px-1 rounded'>$1</code>");
}

function buildPrintHtml(filename: string, raw: string): string {
  const blocks = parseReport(raw);
  let body = "";
  let sec = 0;
  for (const b of blocks) {
    if (b.kind === "h2") { sec++; body += `<h2><span class="sec">${String(sec).padStart(2,"0")}</span>${b.text}</h2>`; }
    else if (b.kind === "h3")      body += `<h3>${b.text}</h3>`;
    else if (b.kind === "rule")    body += `<hr/>`;
    else if (b.kind === "bullet")  body += `<li>${b.text}</li>`;
    else if (b.kind === "numbered") body += `<li class="num"><span>${b.n}</span>${b.text}</li>`;
    else                           body += `<p>${b.text}</p>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>CodeMind — ${filename}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1a1a2e;padding:48px 56px;max-width:900px;margin:0 auto}
.cover{margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #4361EE}
.cover h1{font-size:22px;font-weight:700;letter-spacing:-.3px;margin-bottom:6px}
.cover .sub{font-size:12px;color:#666;font-family:monospace}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#4361EE;margin:28px 0 10px;display:flex;align-items:center;gap:10px}
h2::after{content:'';flex:1;height:1px;background:#e0e4f7}
.sec{background:#4361EE;color:#fff;font-size:9px;padding:2px 5px;border-radius:3px}
h3{font-size:13px;font-weight:700;margin:14px 0 6px;color:#1a1a2e}
p{font-size:13px;line-height:1.75;margin:6px 0;color:#3a3a5c}
hr{border:none;border-top:1px solid #eee;margin:20px 0}
li{font-size:13px;line-height:1.75;margin:4px 0 4px 20px;color:#3a3a5c}
li.num{list-style:none;margin-left:0;display:flex;gap:10px}
li.num span{font-weight:700;color:#4361EE;min-width:18px}
strong{font-weight:700;color:#1a1a2e}code{font-family:monospace;font-size:11px;background:#f0f3ff;padding:1px 4px;border-radius:3px;color:#4361EE}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#999;display:flex;justify-content:space-between}
@media print{body{padding:32px 40px}.cover{page-break-after:avoid}h2{page-break-after:avoid}}
</style></head><body>
<div class="cover"><h1>Architecture Analysis Report</h1>
<div class="sub">${filename} &nbsp;·&nbsp; ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} &nbsp;·&nbsp; Powered by CodeMind + Claude Opus</div></div>
${body}
<div class="footer"><span>CodeMind — Ship without fear</span><span>Confidential · Generated ${new Date().toISOString().slice(0,10)}</span></div>
</body></html>`;
}

export function ReportViewer({ raw, filename, onReset }: { raw: string; filename: string; onReset: () => void }) {
  const blocks = parseReport(raw);
  let secCount = 0;

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildPrintHtml(filename, raw));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden">
      {/* Report header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/60">
        <div>
          <p className="font-mono text-xs font-bold text-brand uppercase tracking-widest mb-0.5">Architecture Analysis</p>
          <p className="font-mono text-[11px] text-ink-dim truncate max-w-xs">{filename}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium text-ink-muted border border-border rounded-lg hover:text-ink hover:border-border/80 transition-colors">
            <Download size={11} /> PDF
          </button>
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors">
            <RotateCcw size={11} /> Analyse Again
          </button>
        </div>
      </div>

      {/* Report body */}
      <div className="p-6 overflow-y-auto max-h-[600px] space-y-1">
        {blocks.map((b, i) => {
          if (b.kind === "h2") {
            secCount++;
            return (
              <div key={i} className="flex items-center gap-3 pt-5 pb-2 first:pt-0">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white bg-brand flex-shrink-0">
                  {String(secCount).padStart(2, "0")}
                </span>
                <span className="font-mono text-[11px] font-bold text-brand uppercase tracking-widest">{b.text}</span>
                <div className="flex-1 h-px bg-brand/20" />
              </div>
            );
          }
          if (b.kind === "h3") return (
            <p key={i} className="font-body text-sm font-bold text-ink pt-3 pb-1">{b.text}</p>
          );
          if (b.kind === "rule") return (
            <div key={i} className="border-t border-border my-4" />
          );
          if (b.kind === "bullet") return (
            <div key={i} className="flex gap-2.5 py-0.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand/50 flex-shrink-0 mt-1.5" />
              <span className="font-body text-sm text-ink-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />
            </div>
          );
          if (b.kind === "numbered") return (
            <div key={i} className="flex gap-3 py-0.5 pl-2">
              <span className="font-mono text-xs font-bold text-brand flex-shrink-0 w-5 pt-0.5">{b.n}.</span>
              <span className="font-body text-sm text-ink-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />
            </div>
          );
          return (
            <p key={i} className="font-body text-sm text-ink-muted leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: inline(b.text) }} />
          );
        })}
      </div>

      <div className="px-6 py-3 border-t border-border flex items-center justify-between">
        <span className="font-mono text-[10px] text-ink-dim">CodeMind · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
        <span className="font-mono text-[10px] text-ink-dim">Powered by Claude Opus</span>
      </div>
    </div>
  );
}
