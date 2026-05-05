import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  convertEnvironment,
  getDownloadFileName,
  parseEnvironment,
} from './converters/convert';
import { ConversionError, type EnvironmentFormat, type NormalizedVariable } from './converters/types';
import { copyToClipboard } from './utils/clipboard';
import { downloadTextFile } from './utils/download';

// ─── Design tokens ───────────────────────────────────────────
const T = {
  paper:      '#F6F2EA',
  paperSoft:  '#FBF8F2',
  card:       '#FFFFFF',
  ink:        '#1B1A17',
  ink2:       '#3D3A33',
  ink3:       '#6B6558',
  hairline:   '#E5DCC9',
  hairline2:  '#D9CFB9',
  accent:     '#1F3D2E',
  accentInk:  '#F4EFD9',
  amber:      '#B45A1E',
  amberSoft:  '#FBE8C7',
  rose:       '#A23F2A',
  roseSoft:   '#F7DDD2',
  sage:       '#7A8E63',
  sageSoft:   '#E5ECCB',
  sky:        '#2A5C7A',
} as const;

const fontSans = '"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const fontMono = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

// ─── Constants ───────────────────────────────────────────────
const FORMAT_LABEL: Record<EnvironmentFormat, string> = {
  postman:    'Postman',
  bruno:      'Bruno',
  'vault-flat': 'Vault JSON',
};

const FORMAT_EXT: Record<EnvironmentFormat, string> = {
  postman:    '.postman_environment.json',
  bruno:      '.bru',
  'vault-flat': '.json',
};

const FORMATS = Object.keys(FORMAT_LABEL) as EnvironmentFormat[];

const EXAMPLE_INPUTS: Record<EnvironmentFormat, string> = {
  postman: JSON.stringify(
    {
      name: 'local',
      values: [
        { key: 'baseUrl',       value: 'https://api.example.com',            type: 'default', enabled: true },
        { key: 'clientId',      value: 'fake-client',                        type: 'default', enabled: true },
        { key: 'clientSecret',  value: 'fake-secret',                        type: 'secret',  enabled: true },
        { key: 'tokenUrl',      value: 'https://auth.example.com/oauth/token', type: 'default', enabled: true },
      ],
      _postman_variable_scope: 'environment',
    },
    null, 2,
  ),
  bruno: [
    'vars {',
    '  baseUrl: https://api.example.com',
    '  clientId: fake-client',
    '  clientSecret: fake-secret',
    '  username: user@example.com',
    '  tokenUrl: https://auth.example.com/oauth/token',
    '}',
    '',
    'vars:secret [',
    '  clientSecret',
    ']',
  ].join('\n'),
  'vault-flat': JSON.stringify(
    {
      baseUrl:      'https://api.example.com',
      clientId:     'fake-client',
      clientSecret: 'fake-secret',
      username:     'user@example.com',
      password:     'fake-password',
      tokenUrl:     'https://auth.example.com/oauth/token',
    },
    null, 2,
  ),
};

// ─── Syntax highlighting ─────────────────────────────────────
function highlightJSON(text: string): string {
  return text
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, `<span style="color:${T.sage}">$1</span>$2`)
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g,   `: <span style="color:${T.amber}">$1</span>`)
    .replace(/:\s*(true|false|null)\b/g,    `: <span style="color:${T.sky}">$1</span>`)
    .replace(/:\s*(-?\d+(?:\.\d+)?)/g,     `: <span style="color:${T.sky}">$1</span>`);
}

function highlightBruno(text: string): string {
  return text
    .replace(/^(vars(?::\w+)?)\s*([{[])/gm,
      `<span style="color:${T.rose};font-weight:600">$1</span> $2`)
    .replace(/^(\s+)([\w.-]+)(:\s*)(.*)$/gm,
      `$1<span style="color:${T.sage}">$2</span>$3<span style="color:${T.amber}">$4</span>`);
}

function highlight(text: string, format: EnvironmentFormat): string {
  if (!text) return '';
  return format === 'bruno' ? highlightBruno(text) : highlightJSON(text);
}

// ─── FormatGlyph ─────────────────────────────────────────────
function FormatGlyph({ format, size = 16, color = T.ink2 }: { format: EnvironmentFormat; size?: number; color?: string }) {
  if (format === 'postman') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M8 12.5l2.5 2.5L16 9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (format === 'bruno') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="6" width="16" height="13" rx="2" stroke={color} strokeWidth="1.5" />
        <path d="M4 9h16" stroke={color} strokeWidth="1.5" />
        <path d="M9 13h6M9 16h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M12 9.5V8M12 16v-1.5M14.5 12H16M8 12h1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── SwapIcon ────────────────────────────────────────────────
function SwapIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Connector ───────────────────────────────────────────────
function Connector({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 540 }}>
      <svg
        width="64"
        height="100%"
        viewBox="0 0 64 600"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden
      >
        <path d="M0 100 C 32 100, 32 500, 64 500" stroke={T.hairline2} strokeWidth="1" fill="none" strokeDasharray="3 4" />
      </svg>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="Swap source and target"
        aria-label="Swap source and target"
        style={{
          position: 'relative',
          width: 44, height: 44, borderRadius: '50%',
          background: T.accent, color: T.accentInk,
          display: 'grid', placeItems: 'center',
          border: 'none', padding: 0, cursor: 'pointer',
          boxShadow: hover
            ? `0 0 0 6px ${T.paperSoft}, 0 10px 22px -6px rgba(31,61,46,0.55)`
            : `0 0 0 6px ${T.paperSoft}, 0 6px 18px -6px rgba(31,61,46,0.4)`,
          transform: hover ? 'rotate(180deg) scale(1.06)' : 'rotate(0deg) scale(1)',
          transition: 'transform 240ms ease, box-shadow 200ms ease',
        }}
      >
        <SwapIcon size={18} />
      </button>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [sourceFormat, setSourceFormat] = useState<EnvironmentFormat>('postman');
  const [targetFormat, setTargetFormat] = useState<EnvironmentFormat>('bruno');
  const [environmentName, setEnvironmentName] = useState('local');
  const [input, setInput] = useState(EXAMPLE_INPUTS.postman);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedVars = useMemo<NormalizedVariable[]>(() => {
    if (!input.trim()) return [];
    try { return parseEnvironment(sourceFormat, input).variables; }
    catch { return []; }
  }, [input, sourceFormat]);

  const secretCount = parsedVars.filter((v) => v.secret).length;
  const downloadFileName = getDownloadFileName(targetFormat, environmentName);

  useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      setError('');
      return;
    }

    try {
      setOutput(convertEnvironment(sourceFormat, targetFormat, input, environmentName));
      setError('');
    } catch (e) {
      setOutput('');
      setError(e instanceof ConversionError || e instanceof Error ? e.message : 'Unable to convert this input.');
    }
  }, [environmentName, input, sourceFormat, targetFormat]);

  // ── handlers ──
  function handleReset() {
    setInput(''); setOutput(''); setError(''); setStatus('');
  }

  function handleSwap() {
    const newSource = targetFormat;
    const newTarget = sourceFormat;
    setSourceFormat(newSource);
    setTargetFormat(newTarget);
    if (output) {
      setInput(output);
    } else {
      setInput(EXAMPLE_INPUTS[newSource]);
    }
    setError(''); setStatus('');
  }

  function handleSourceFormatChange(format: EnvironmentFormat) {
    const shouldReplace = !input.trim() || input === EXAMPLE_INPUTS[sourceFormat];
    setSourceFormat(format);
    setError('');
    if (shouldReplace) { setInput(EXAMPLE_INPUTS[format]); setStatus(`Loaded ${FORMAT_LABEL[format]} example.`); }
    else { setStatus(''); }
  }

  function handleTargetFormatChange(format: EnvironmentFormat) {
    setTargetFormat(format);
    setError(''); setStatus('');
  }

  function handleLoadExample() {
    setInput(EXAMPLE_INPUTS[sourceFormat]);
    setError('');
    setStatus(`Loaded ${FORMAT_LABEL[sourceFormat]} example.`);
  }

  async function handleFileRead(file: File) {
    setError(''); setStatus('');
    try {
      setInput(await file.text());
      if (!environmentName.trim()) {
        setEnvironmentName(file.name.replace(/\.(postman_environment\.json|bru|json)$/i, ''));
      }
      setStatus(`Loaded ${file.name}.`);
    } catch {
      setError('Could not read that file. Try pasting the contents instead.');
    }
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleFileRead(file);
  }

  function handleDragOver(e: DragEvent) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileRead(file);
  }

  async function handleCopy() {
    setError(''); setStatus('');
    try { await copyToClipboard(output); setStatus('Output copied.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to copy output to the clipboard.'); }
  }

  function handleDownload() {
    if (!output) return;
    downloadTextFile(downloadFileName, output);
    setStatus(`Downloaded ${downloadFileName}.`);
  }

  // ── layout ──
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      height: '100vh',
      fontFamily: fontSans,
      color: T.ink,
      borderTop: `4px solid ${T.accent}`,
      overflow: 'hidden',
    }}>
      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside style={{
        background: T.card,
        borderRight: `1px solid ${T.hairline}`,
        padding: '36px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        minHeight: '100vh',
      }}>
        {/* Header */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 999,
            background: T.sageSoft, color: T.accent,
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
            in-browser only
          </div>
          <h1 style={{
            fontFamily: fontMono, fontSize: 22, fontWeight: 500,
            margin: '0 0 10px', lineHeight: 1.1,
            letterSpacing: '-0.02em', textTransform: 'uppercase',
          }}>
            Credentials<br />
            <span style={{ color: T.accent }}>Converter</span>
          </h1>
          <p style={{ color: T.ink3, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            Postman ⇄ Bruno ⇄ Vault. No upload, no tracking, no storage.
          </p>
        </div>

        {/* Pipeline */}
        <SidebarSection title="Pipeline">
          <div style={{
            border: `1px solid ${T.hairline}`, borderRadius: 12,
            background: T.paperSoft, padding: 4,
          }}>
            <PipelineRow
              role="Source"
              value={sourceFormat}
              onChange={handleSourceFormatChange}
              accentColor={T.amber}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
            />
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 0' }}>
              <button
                type="button"
                onClick={handleSwap}
                title="Swap source and target"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: T.card, border: `1px solid ${T.hairline2}`,
                  color: T.ink2, cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
              >
                <SwapIcon size={13} />
              </button>
            </div>
            <PipelineRow
              role="Target"
              value={targetFormat}
              onChange={handleTargetFormatChange}
              accentColor={T.sage}
            />
          </div>
        </SidebarSection>

        {/* Output name */}
        <SidebarSection title="Output name">
          <div style={{
            padding: '9px 12px', borderRadius: 10,
            background: T.paperSoft, border: `1px solid ${T.hairline}`,
          }}>
            <input
              value={environmentName}
              onChange={(e) => setEnvironmentName(e.target.value)}
              aria-label="Environment name"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontFamily: fontMono, fontSize: 13, color: T.ink,
              }}
            />
            <div style={{
              fontFamily: fontMono, fontSize: 11, color: T.ink3,
              marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
              title={downloadFileName}
              aria-label={`Output file name: ${downloadFileName}`}
            >
              {downloadFileName}
            </div>
          </div>
        </SidebarSection>

        {/* Variables detected */}
        {parsedVars.length > 0 && (
          <SidebarSection title="Variables detected">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {parsedVars.map((v) => (
                <div key={v.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 10px', borderRadius: 6,
                  background: v.secret ? T.roseSoft : 'transparent',
                }}>
                  <span style={{ fontFamily: fontMono, fontSize: 12, color: T.ink }}>{v.key}</span>
                  {v.secret && (
                    <span style={{
                      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: T.rose, fontWeight: 600,
                    }}>secret</span>
                  )}
                </div>
              ))}
            </div>
          </SidebarSection>
        )}

      </aside>

      {/* ══ MAIN ════════════════════════════════════════════ */}
      <main style={{
        padding: '36px 48px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
        minWidth: 0, minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingBottom: 16, borderBottom: `1px solid ${T.hairline}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: T.ink3 }}>
            <span>Workspace</span>
            <span>/</span>
            <span style={{ color: T.ink, fontWeight: 600 }}>{environmentName || 'untitled'}</span>
            {error ? (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: '#F7DDD2', color: T.rose, fontSize: 11, fontWeight: 600 }}>error</span>
            ) : status ? (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: T.sageSoft, color: T.accent, fontSize: 11, fontWeight: 600 }}>ready</span>
            ) : null}
          </div>
        </div>

        {/* Two-pane editor */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 64px 1fr',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}>
          {/* Source pane */}
          <div
            style={{
              background: T.card,
              border: `1px solid ${isDragging ? T.amber : T.hairline}`,
            borderRight: 'none',
            borderRadius: '14px 0 0 14px',
              display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)',
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: isDragging ? `0 0 0 3px ${T.amberSoft}` : 'none',
              transition: 'box-shadow 160ms, border-color 160ms',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 16px', borderBottom: `1px solid ${T.hairline}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.14em', background: T.amber, color: '#fff',
                }}>IN</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Source</div>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: fontMono, marginTop: 1 }}>
                    {FORMAT_LABEL[sourceFormat]} · pasted
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GhostButton onClick={handleLoadExample}>Load example</GhostButton>
                <GhostButton onClick={handleReset}>Reset</GhostButton>
                <FormatGlyph format={sourceFormat} size={18} color={T.ink3} />
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); setStatus(''); }}
              placeholder="Paste your environment here, or drag-and-drop a file…"
              spellCheck={false}
              style={{
                width: '100%', height: '100%',
                border: 'none', resize: 'none', outline: 'none',
                padding: '16px 18px',
                fontFamily: fontMono, fontSize: 12.5, lineHeight: 1.65,
                color: T.ink, background: 'transparent',
              }}
            />
            {isDragging && (
              <div style={{
                position: 'absolute', inset: 0,
                background: `${T.amberSoft}cc`,
                backdropFilter: 'blur(2px)',
                display: 'grid', placeItems: 'center',
                color: T.amber, fontSize: 14, fontWeight: 600,
                pointerEvents: 'none',
              }}>
                Drop file to load
              </div>
            )}
          </div>

          <Connector onClick={handleSwap} />

          {/* Target pane */}
          <div style={{
            background: T.card,
            border: `1px solid ${T.hairline}`,
            borderLeft: 'none',
            borderRadius: '0 14px 14px 0',
            display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)',
            minHeight: 0,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 16px', borderBottom: `1px solid ${T.hairline}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.14em', background: T.sage, color: '#fff',
                }}>OUT</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Target</div>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: fontMono, marginTop: 1 }}>
                    {FORMAT_LABEL[targetFormat]} · {environmentName || 'untitled'}{FORMAT_EXT[targetFormat]}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GhostButton onClick={handleCopy} disabled={!output}>Copy</GhostButton>
                <GhostButton onClick={handleDownload} disabled={!output}>Download</GhostButton>
                <FormatGlyph format={targetFormat} size={18} color={T.ink3} />
              </div>
            </div>

            <div style={{ minHeight: 0, overflow: 'auto' }}>
              {output ? (
                <pre style={{
                  margin: 0, padding: '16px 18px',
                  fontFamily: fontMono, fontSize: 12.5, lineHeight: 1.65,
                  color: T.ink, background: 'transparent',
                  whiteSpace: 'pre',
                }}>
                  <code dangerouslySetInnerHTML={{ __html: highlight(output, targetFormat) }} />
                </pre>
              ) : (
                <div style={{
                  padding: '16px 18px',
                  fontFamily: fontMono, fontSize: 12.5, color: T.ink3,
                }}>
                  {error
                    ? <span style={{ color: T.rose }}>{error}</span>
                    : 'Converted output appears here automatically.'}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Status footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '11px 14px', borderRadius: 10,
          background: T.card, border: `1px solid ${T.hairline}`,
          fontFamily: fontMono, fontSize: 12, color: T.ink3,
        }}>
          <span>
            {parsedVars.length} var{parsedVars.length !== 1 ? 's' : ''} · {secretCount} secret{secretCount !== 1 ? 's' : ''} detected
          </span>
          {status && !error && (
            <span style={{ color: T.accent, fontWeight: 500 }}>{status}</span>
          )}
        </div>
      </main>

      {/* Hidden file input for sidebar upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.bru,application/json,text/plain"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        aria-hidden
      />
    </div>
  );
}

// ─── Small shared components ─────────────────────────────────
function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: T.ink3, marginBottom: 10, fontWeight: 600,
      }}>{title}</div>
      {children}
    </div>
  );
}

function PipelineRow({
  role, value, onChange, accentColor, fileInputRef, onFileUpload,
}: {
  role: string;
  value: EnvironmentFormat;
  onChange: (f: EnvironmentFormat) => void;
  accentColor: string;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onFileUpload?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{
      background: T.card, borderRadius: 8, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink3, fontWeight: 600 }}>{role}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <FormatGlyph format={value} size={13} color={T.ink} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{FORMAT_LABEL[value]}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {fileInputRef && onFileUpload && (
          <button
            type="button"
            title="Upload file"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.hairline2}`,
              background: 'transparent', color: T.ink3, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as EnvironmentFormat)}
          style={{
            appearance: 'none', WebkitAppearance: 'none',
            border: `1px solid ${T.hairline2}`, borderRadius: 6,
            padding: '3px 7px', background: 'transparent',
            fontSize: 11, color: T.ink2, cursor: 'pointer',
          }}
        >
          {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
        </select>
      </div>
    </div>
  );
}

function GhostButton({
  onClick, disabled, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 13px', borderRadius: 8,
        background: 'transparent', color: disabled ? T.ink3 : T.ink2,
        border: `1px solid ${T.hairline2}`,
        fontSize: 13, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
