import React, { useState, useEffect } from 'react';
import { ExtractedChunk } from '../types';
import { apiFetch } from '../lib/api';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Sparkles, 
  Layers, 
  List, 
  FileCode,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface VerbatimDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: ExtractedChunk[];
  sourceTitle: string;
}

type CompilationStyle = 'categorized' | 'flow' | 'reference' | 'bullet' | 'ai-structure';

export const VerbatimDocumentModal: React.FC<VerbatimDocumentModalProps> = ({
  isOpen,
  onClose,
  quotes,
  sourceTitle,
}) => {
  const [docStyle, setDocStyle] = useState<CompilationStyle>('categorized');
  const [documentContent, setDocumentContent] = useState('');
  const [isCompilingWithAI, setIsCompilingWithAI] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate deterministic verbatim compilation based on selected style
  const generateVerbatimDocument = (style: CompilationStyle, quotesList: ExtractedChunk[]) => {
    if (!quotesList || quotesList.length === 0) {
      return '# Verbatim Compilation\n\nNo quotes selected.';
    }

    const title = sourceTitle || 'Verbatim Quotes Compilation';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (style === 'flow') {
      // Direct continuous flow of verbatim quotes
      return `# ${title}\n\n` + quotesList.map(q => q.verbatimText.trim()).join('\n\n');
    }

    if (style === 'bullet') {
      // Clean bullet list of verbatim quotes
      return `# ${title}\n\n` +
        `*Compiled on ${dateStr} | ${quotesList.length} exact quotes | Zero summarization*\n\n` +
        quotesList.map(q => `- "${q.verbatimText}"`).join('\n');
    }

    if (style === 'reference') {
      // Structured academic/technical citation doc
      return `# ${title}\n\n` +
        `**Metadata**: Verbatim Extraction Record\n` +
        `**Date**: ${dateStr}\n` +
        `**Total Quotes**: ${quotesList.length}\n` +
        `**Fidelity Level**: 100% Word-for-Word Source Truth\n\n` +
        `---\n\n` +
        quotesList.map((q, idx) => (
          `### [Quote ${idx + 1}] ${q.category}\n` +
          `> "${q.verbatimText}"\n\n` +
          `- **Confidence Score**: ${q.score}%\n` +
          (q.note ? `- **Citation Context**: ${q.note}\n` : '')
        )).join('\n---\n\n');
    }

    // Default 'categorized' Markdown style
    const grouped: { [key: string]: ExtractedChunk[] } = {};
    quotesList.forEach(q => {
      const cat = q.category.toUpperCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(q);
    });

    let md = `# ${title}\n\n`;
    md += `*Compiled on ${dateStr} — ${quotesList.length} verbatim extracts*\n\n`;

    Object.entries(grouped).forEach(([cat, items]) => {
      md += `## ${cat}\n\n`;
      items.forEach(item => {
        md += `> "${item.verbatimText}"\n\n`;
        if (item.note) {
          md += `*Note: ${item.note} (Confidence: ${item.score}%)*\n\n`;
        }
      });
    });

    return md.trim();
  };

  // Compile with AI without summarizing
  const handleAICompile = async () => {
    setIsCompilingWithAI(true);
    try {
      const response = await apiFetch('/api/compile-document', {
        method: 'POST',
        body: JSON.stringify({
          quotes: quotes.map(q => ({
            category: q.category,
            verbatimText: q.verbatimText,
            note: q.note,
            score: q.score,
          })),
          title: sourceTitle,
          format: 'categorized',
        }),
      });
      const data = await response.json();
      if (data.compiledText) {
        setDocumentContent(data.compiledText);
      }
    } catch (err) {
      console.error('AI Document compilation failed:', err);
      setDocumentContent(generateVerbatimDocument('categorized', quotes));
    } finally {
      setIsCompilingWithAI(false);
    }
  };

  // Update content when style or quotes change
  useEffect(() => {
    if (docStyle === 'ai-structure') {
      handleAICompile();
    } else {
      setDocumentContent(generateVerbatimDocument(docStyle, quotes));
    }
  }, [docStyle, quotes, sourceTitle]);

  if (!isOpen) return null;

  const wordCount = documentContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = documentContent.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(documentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (ext: 'md' | 'txt' | 'doc') => {
    const filename = `${(sourceTitle || 'verbatim-compilation').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${ext}`;
    let mimeType = 'text/markdown;charset=utf-8';
    if (ext === 'txt') mimeType = 'text/plain;charset=utf-8';
    if (ext === 'doc') mimeType = 'application/msword;charset=utf-8';

    const blob = new Blob([documentContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Verbatim Document Builder</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Zero Summarization
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Combining {quotes.length} selected quotes word-for-word with 100% source fidelity.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/60 transition-colors"
            id="btn-close-doc-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Selector Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setDocStyle('categorized')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                docStyle === 'categorized'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              id="btn-style-categorized"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categorized Markdown</span>
            </button>
            <button
              onClick={() => setDocStyle('flow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                docStyle === 'flow'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              id="btn-style-flow"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Verbatim Flow</span>
            </button>
            <button
              onClick={() => setDocStyle('bullet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                docStyle === 'bullet'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              id="btn-style-bullet"
            >
              <List className="w-3.5 h-3.5" />
              <span>Bullet List</span>
            </button>
            <button
              onClick={() => setDocStyle('reference')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                docStyle === 'reference'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              id="btn-style-reference"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Reference Log</span>
            </button>
            <button
              onClick={() => setDocStyle('ai-structure')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                docStyle === 'ai-structure'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
              id="btn-style-ai-structure"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Structure Assembler</span>
            </button>
          </div>

          {/* Metrics */}
          <div className="text-xs text-gray-500 flex items-center gap-3">
            <span><strong>{quotes.length}</strong> quotes</span>
            <span>•</span>
            <span><strong>{wordCount}</strong> words</span>
            <span>•</span>
            <span><strong>{charCount}</strong> chars</span>
          </div>
        </div>

        {/* Document Editor Area */}
        <div className="flex-1 p-6 flex flex-col min-h-0 bg-[#FBFBFC]">
          {isCompilingWithAI ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-gray-200">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-900">Assembling Verbatim Document...</p>
              <p className="text-xs text-gray-500 mt-1">Organizing exact quotes without altering a single word.</p>
            </div>
          ) : (
            <textarea
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              className="w-full flex-1 p-5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-mono text-gray-800 leading-relaxed resize-none transition-all bg-white shadow-inner"
              placeholder="Your verbatim compiled document will appear here..."
              id="textarea-compiled-document"
            />
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Download format:</span>
            <button
              onClick={() => handleDownloadFile('md')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors inline-flex items-center gap-1"
              id="btn-download-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.md</span>
            </button>
            <button
              onClick={() => handleDownloadFile('txt')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors inline-flex items-center gap-1"
              id="btn-download-txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.txt</span>
            </button>
            <button
              onClick={() => handleDownloadFile('doc')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors inline-flex items-center gap-1"
              id="btn-download-doc"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.doc</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
              id="btn-copy-compiled-doc"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
              <span>{copied ? 'Copied Document' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-900 hover:bg-black text-white transition-colors shadow-sm"
              id="btn-done-compilation"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
