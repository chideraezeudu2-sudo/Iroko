import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExtractedChunk, ExtractionRecord, ConfidenceLevel } from '../types';
import { SAMPLE_PRESETS } from '../data/presets';
import { VerbatimDocumentModal } from './VerbatimDocumentModal';
import { apiFetch } from '../lib/api';
import { 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  Edit3, 
  AlertCircle, 
  FileJson, 
  FileSpreadsheet, 
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Info,
  Layers,
  Search,
  LayoutGrid,
  List,
  X,
  Sparkles,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Zap,
  Upload,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  ArrowRight
} from 'lucide-react';

interface ExtractWorkspaceProps {
  currentRecord: ExtractionRecord | null;
  onSaveRecord: (record: ExtractionRecord) => void;
  hideWeakConfidence: boolean;
}

export const ExtractWorkspace: React.FC<ExtractWorkspaceProps> = ({
  currentRecord,
  onSaveRecord,
  hideWeakConfidence,
}) => {
  // Input state
  const [inputText, setInputText] = useState(
    currentRecord?.rawInput ?? SAMPLE_PRESETS[0].text
  );
  const [criteria, setCriteria] = useState('');
  const [title, setTitle] = useState(currentRecord?.title || 'Drivetrain Subsystem Log');
  const [isExtracting, setIsExtracting] = useState(false);
  const [entities, setEntities] = useState<ExtractedChunk[]>(
    currentRecord?.entities || [
      {
        id: 'chunk-1',
        category: 'PROGRESS METRIC',
        verbatimText: 'The chassis build is 85% complete.',
        score: 98,
        level: 'strong',
        note: 'Direct quantitative progress indicator',
      },
      {
        id: 'chunk-2',
        category: 'ISSUE RESOLUTION',
        verbatimText: 'We ran into a minor issue with the motor controller calibration yesterday, but the firmware update resolved it this morning.',
        score: 82,
        level: 'partial',
        note: 'Describes technical calibration fix and timing',
      },
      {
        id: 'chunk-3',
        category: 'TARGET DEADLINE',
        verbatimText: 'The full assembly will be ready for field trials by Friday.',
        score: 94,
        level: 'strong',
        note: 'Explicit milestone timeline',
      },
    ]
  );

  // Quote Selection & Document Builder State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDocModal, setShowDocModal] = useState(false);

  // Dynamic Panel Visibility
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split Panel Resizing & Dragging Logic
  const [splitRatio, setSplitRatio] = useState<number>(45); // Left panel percentage (45% left, 55% right)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const percentage = (currentX / rect.width) * 100;
      
      // Constrain dragging between 20% and 80%
      if (percentage >= 20 && percentage <= 80) {
        setSplitRatio(percentage);
        if (!isRightPanelOpen) {
          setIsRightPanelOpen(true);
        }
      } else if (percentage > 85) {
        setIsRightPanelOpen(false);
      } else if (percentage < 15) {
        setSplitRatio(20);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isRightPanelOpen]);

  // Quick Search & View State
  const [quickSearch, setQuickSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [selectedFilter, setSelectedFilter] = useState<'all' | ConfidenceLevel>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Sync state when activeRecord changes
  useEffect(() => {
    if (currentRecord) {
      setInputText(currentRecord.rawInput ?? '');
      setTitle(currentRecord.title || 'Source Extraction');
      setEntities(currentRecord.entities || []);
      setSelectedIds(new Set());
      setCriteria('');
      setQuickSearch('');
      setIsRightPanelOpen(true);
    }
  }, [currentRecord?.id]);

  // UI Filter and Dropdown state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editChunkText, setEditChunkText] = useState('');
  const [editChunkCategory, setEditChunkCategory] = useState('');

  const [extractionModelNotice, setExtractionModelNotice] = useState<string | null>(null);

  // ---- Chunk action (per-chunk & bulk free-text instructions) ----
  const [bulkInstruction, setBulkInstruction] = useState('');
  const [bulkActionResult, setBulkActionResult] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);

  // Per-chunk action state keyed by chunk id.
  const [chunkInstruction, setChunkInstruction] = useState<Record<string, string>>({});
  const [chunkActionResult, setChunkActionResult] = useState<Record<string, string>>({});
  const [chunkActionLoading, setChunkActionLoading] = useState<Record<string, boolean>>({});
  const [chunkActionOpen, setChunkActionOpen] = useState<string | null>(null);

  const runChunkAction = async (chunkIds: string[], instruction: string) => {
    const selected = entities.filter((e) => chunkIds.includes(e.id));
    const response = await apiFetch('/api/chunk-action', {
      method: 'POST',
      body: JSON.stringify({
        chunks: selected.map((c) => ({
          category: c.category,
          verbatimText: c.verbatimText,
          note: c.note,
          score: c.score,
        })),
        instruction,
        allChunksContext: entities.map((e) => `[${e.category}] "${e.verbatimText}"`).join('\n'),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Action failed.');
    return data.result as string;
  };

  const handleBulkAction = async () => {
    if (!bulkInstruction.trim() || selectedIds.size === 0) return;
    setBulkActionLoading(true);
    setBulkActionError(null);
    try {
      const result = await runChunkAction(Array.from(selectedIds), bulkInstruction.trim());
      setBulkActionResult(result);
    } catch (err: any) {
      setBulkActionError(err?.message || 'Action failed.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSingleChunkAction = async (chunkId: string) => {
    const instruction = (chunkInstruction[chunkId] || '').trim();
    if (!instruction) return;
    setChunkActionLoading((p) => ({ ...p, [chunkId]: true }));
    try {
      const result = await runChunkAction([chunkId], instruction);
      setChunkActionResult((p) => ({ ...p, [chunkId]: result }));
    } catch (err: any) {
      setChunkActionResult((p) => ({ ...p, [chunkId]: `Error: ${err?.message || 'failed'}` }));
    } finally {
      setChunkActionLoading((p) => ({ ...p, [chunkId]: false }));
    }
  };

  // Distinct categories available in current entities
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    entities.forEach(e => cats.add(e.category.toUpperCase()));
    return Array.from(cats);
  }, [entities]);

  // Handle Extraction Trigger
  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setIsExtracting(true);
    setIsRightPanelOpen(true);
    setExtractionModelNotice(null);

    try {
      const response = await apiFetch('/api/extract', {
        method: 'POST',
        body: JSON.stringify({
          text: inputText,
          criteria: criteria || undefined,
          label: title,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Extraction failed.');
      }

      // Backend persists and returns a record with DB ids + entities.
      const persisted: ExtractionRecord = data.record;
      const extractedList: ExtractedChunk[] = persisted?.entities || data.entities || [];

      const record: ExtractionRecord = persisted || {
        id: `rec-${Date.now()}`,
        title: title || 'Extraction ' + new Date().toLocaleTimeString(),
        rawInput: inputText,
        extractedAt: new Date().toISOString(),
        characterCount: inputText.length,
        volume: extractedList.length,
        status: 'completed',
        entities: extractedList,
      };

      setEntities(record.entities);
      setSelectedIds(new Set());

      if (data.warning) {
        setExtractionModelNotice(data.warning);
      } else if (data.modelUsed) {
        setExtractionModelNotice(`Extracted via ${data.modelUsed}`);
      }

      onSaveRecord(record);
    } catch (err: any) {
      console.error('Extraction request failed:', err);
      setExtractionModelNotice(err?.message || 'Extraction request failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle File Upload or Drop for unlimited chats/transcripts
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (typeof content === 'string') {
        setInputText(content);
        if (!title || title === 'Source Document' || title.startsWith('Extraction ')) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Filter entities according to user preferences, confidence level, category, and quick search query
  const filteredEntities = useMemo(() => {
    return entities.filter((chunk) => {
      // 1. Hide weak confidence preference
      if (hideWeakConfidence && chunk.level === 'weak') return false;

      // 2. Confidence level filter
      if (selectedFilter !== 'all' && chunk.level !== selectedFilter) return false;

      // 3. Category filter
      if (selectedCategoryFilter !== 'all' && chunk.category.toUpperCase() !== selectedCategoryFilter) return false;

      // 4. Quick search query
      if (quickSearch.trim()) {
        const query = quickSearch.toLowerCase();
        const matchesText = chunk.verbatimText.toLowerCase().includes(query);
        const matchesCat = chunk.category.toLowerCase().includes(query);
        const matchesNote = (chunk.note || '').toLowerCase().includes(query);
        if (!matchesText && !matchesCat && !matchesNote) return false;
      }

      return true;
    });
  }, [entities, hideWeakConfidence, selectedFilter, selectedCategoryFilter, quickSearch]);

  // Statistics calculation for data overview strip
  const stats = useMemo(() => {
    const total = entities.length;
    const high = entities.filter(e => e.score >= 85).length;
    const moderate = entities.filter(e => e.score >= 60 && e.score < 85).length;
    const needsReview = entities.filter(e => e.score < 60).length;
    const avgScore = total > 0 ? Math.round(entities.reduce((acc, curr) => acc + curr.score, 0) / total) : 0;
    return { total, high, moderate, needsReview, avgScore };
  }, [entities]);

  // Copy selected quotes raw text to clipboard (Free tier feature)
  const [copiedSelected, setCopiedSelected] = useState(false);

  const handleCopySelectedRaw = () => {
    const selectedChunks = entities.filter(e => selectedIds.has(e.id));
    if (selectedChunks.length === 0) return;
    const rawText = selectedChunks.map(c => c.verbatimText.trim()).join('\n\n');
    navigator.clipboard.writeText(rawText);
    setCopiedSelected(true);
    setTimeout(() => setCopiedSelected(false), 2500);
  };

  // Selection toggles
  const toggleSelectChunk = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected = filteredEntities.length > 0 && filteredEntities.every(e => selectedIds.has(e.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredEntities.forEach(e => next.delete(e.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredEntities.forEach(e => next.add(e.id));
        return next;
      });
    }
  };

  // Quotes to compile into document
  const quotesToCompile = useMemo(() => {
    if (selectedIds.size > 0) {
      return entities.filter(e => selectedIds.has(e.id));
    }
    return filteredEntities.length > 0 ? filteredEntities : entities;
  }, [entities, filteredEntities, selectedIds]);

  // Copy chunk to clipboard
  const handleCopyChunk = (chunk: ExtractedChunk) => {
    navigator.clipboard.writeText(chunk.verbatimText);
    setCopiedId(chunk.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy all chunks formatted
  const handleCopyAll = () => {
    const formatted = filteredEntities
      .map((e) => `[${e.category}] (${e.score}% Confidence)\n"${e.verbatimText}"\n${e.note ? `Context: ${e.note}` : ''}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataToExport = selectedIds.size > 0 ? entities.filter(e => selectedIds.has(e.id)) : entities;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `iroko-extraction-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0 ? entities.filter(e => selectedIds.has(e.id)) : entities;
    const headers = ['Category', 'Confidence Score', 'Level', 'Exact Verbatim Text', 'Notes'];
    const rows = dataToExport.map(e => [
      `"${e.category.replace(/"/g, '""')}"`,
      e.score,
      e.level,
      `"${e.verbatimText.replace(/"/g, '""')}"`,
      `"${(e.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `iroko-extraction-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
  };

  // Export Markdown
  const handleExportMarkdown = () => {
    const dataToExport = selectedIds.size > 0 ? entities.filter(e => selectedIds.has(e.id)) : entities;
    const md = `# Iroko Extraction: ${title}\n\n*Generated on ${new Date().toLocaleString()}*\n\n` +
      dataToExport.map(e => `### [${e.category}] (${e.score}% Confidence)\n> "${e.verbatimText}"\n\n*Context: ${e.note || 'None recorded'}*\n`).join('\n---\n\n');
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `iroko-extraction-${Date.now()}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
  };

  // Delete single chunk
  const handleDeleteChunk = (id: string) => {
    setEntities(prev => prev.filter(item => item.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Save inline edit
  const handleSaveEdit = (id: string) => {
    setEntities(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          category: editChunkCategory.toUpperCase(),
          verbatimText: editChunkText,
        };
      }
      return item;
    }));
    setEditingChunkId(null);
  };

  // Color helper for category
  const getCategoryBadgeClass = (category: string) => {
    const cat = category.toUpperCase();
    if (cat.includes('STATUS') || cat.includes('PROGRESS') || cat.includes('METRIC')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (cat.includes('ISSUE') || cat.includes('BUG') || cat.includes('ERROR') || cat.includes('RESOLUTION')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (cat.includes('TIME') || cat.includes('DATE') || cat.includes('SCHEDULE') || cat.includes('DEADLINE')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (cat.includes('FINANCE') || cat.includes('BUDGET') || cat.includes('REVENUE') || cat.includes('COST')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (cat.includes('DECISION') || cat.includes('ACTION') || cat.includes('VOTE')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Score badge helper
  const getScoreBadge = (score: number, level: ConfidenceLevel) => {
    if (level === 'strong' || score >= 85) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {score}% Confidence
        </span>
      );
    }
    if (level === 'partial' || (score >= 60 && score < 85)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {score}% Moderate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        {score}% Review
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50/60">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Workspace</h1>
            <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-md">
              Verbatim Mode
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Extract exact quotes, statistics, and decisions directly from your unstructured source text.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 relative flex-wrap">
          {/* Quotes Panel Expand/Collapse Toggle */}
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] ${
              isRightPanelOpen
                ? 'bg-gray-100 text-gray-800 border-gray-300 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            id="btn-toggle-quotes-panel"
            title={isRightPanelOpen ? "Collapse quotes panel" : "Expand quotes panel"}
          >
            {isRightPanelOpen ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-gray-600" />
                <span className="hidden sm:inline">Collapse Quotes</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-gray-600" />
                <span>Show Quotes ({entities.length})</span>
              </>
            )}
          </button>

          {/* Copy Selected Button (Appears when quotes are selected - Free Tier feature) */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleCopySelectedRaw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition-all shadow-xs"
              id="btn-copy-selected-header"
              title="Copy raw text of selected quotes to clipboard"
            >
              {copiedSelected ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied {selectedIds.size} Quotes!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Selected ({selectedIds.size})</span>
                </>
              )}
            </button>
          )}

          {/* Combine / Create Document CTA */}
          <button
            onClick={() => setShowDocModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white transition-all shadow-xs"
            id="btn-open-doc-builder"
            title="Combine selected quotes into a formatted document without summarizing"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              {selectedIds.size > 0 
                ? `Create Document (${selectedIds.size})` 
                : 'Create Document'}
            </span>
          </button>

          <button
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98] transition-all shadow-2xs"
            id="btn-copy-all-chunks"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            <span>{copiedAll ? 'Copied All' : 'Copy All'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-black active:scale-[0.98] transition-all shadow-2xs"
              id="btn-export-dropdown-toggle"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                id="export-dropdown-menu"
              >
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2.5 transition-colors"
                  id="btn-export-csv"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export as CSV (.csv)</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2.5 transition-colors"
                  id="btn-export-json"
                >
                  <FileJson className="w-4 h-4 text-blue-600" />
                  <span>Export as JSON (.json)</span>
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2.5 transition-colors"
                  id="btn-export-markdown"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Export as Markdown (.md)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Resizable Split Container */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col lg:flex-row overflow-hidden relative"
      >
        {/* Left Column: Raw Input Data */}
        <div 
          style={{ 
            width: isRightPanelOpen ? `${splitRatio}%` : '100%',
          }}
          className="bg-white flex flex-col h-full overflow-hidden transition-[width] duration-75 min-w-[320px]"
        >
          {/* Input Header & Controls */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Source Document & Chats
              </span>
              {inputText.length > 0 && (
                <span className="text-[11px] text-gray-400 font-mono">
                  ({inputText.length.toLocaleString()} chars)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Hidden File Input for Large Logs / Transcripts */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                accept=".txt,.md,.log,.json,.csv,.rtf"
                className="hidden"
                id="file-upload-input"
              />

              {/* Upload File Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-2xs active:scale-[0.98] transition-all"
                id="btn-upload-file"
                title="Upload chat log or document (.txt, .log, .md, .json, .csv)"
              >
                <Upload className="w-3.5 h-3.5 text-gray-500" />
                <span>Upload File</span>
              </button>

              {/* Presets Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowPresetMenu(!showPresetMenu)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-2xs active:scale-[0.98] transition-all"
                  id="btn-sample-presets-dropdown"
                >
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  <span>Load Sample</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                </button>

                {showPresetMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-100"
                    id="presets-menu"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1 flex items-center justify-between">
                      <span>Sample Scenarios</span>
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">4 PRESETS</span>
                    </div>
                    <div className="space-y-1">
                      {SAMPLE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setInputText(preset.text);
                            setTitle(preset.title);
                            setShowPresetMenu(false);
                          }}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                          id={`preset-btn-${preset.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {preset.title}
                            </p>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear Input */}
              <button
                onClick={() => setInputText('')}
                title="Clear input text"
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
                id="btn-clear-input"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Text Area & Dedicated Prompt Box */}
          <div 
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDrop}
            className="flex-1 p-5 flex flex-col min-h-0 space-y-3.5 overflow-y-auto relative"
          >
            {/* Drag & Drop Visual Overlay */}
            {isDraggingFile && (
              <div className="absolute inset-4 z-20 bg-blue-50/95 border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center text-center p-6 backdrop-blur-xs transition-all pointer-events-none">
                <Upload className="w-10 h-10 text-blue-600 mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-blue-900">Drop your file here</p>
                <p className="text-xs text-blue-700 mt-1">Accepts unlimited chat transcripts, logs, .txt, .md, .json</p>
              </div>
            )}

            {/* Main Textarea */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste raw conversation logs, chat transcripts, customer support threads, meeting minutes, research notes, or technical specs here..."
                className="w-full flex-1 p-4 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 text-sm text-gray-800 font-sans leading-relaxed resize-none transition-all placeholder:text-gray-400 bg-[#FAFAFA] focus:bg-white font-mono"
                id="raw-input-textarea"
              />
            </div>

            {/* Dedicated AI Extraction Focus Criteria Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-800">
                    Focus Criteria
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">
                  Optional AI prompt
                </span>
              </div>

              {/* Quick Prompt Suggestion Chips */}
              <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                <span className="text-[10px] text-gray-400">Suggestions:</span>
                <button
                  type="button"
                  onClick={() => setCriteria('Extract financial statistics, revenue numbers, percentages, and budget totals')}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors shadow-2xs"
                >
                  Financial Metrics
                </button>
                <button
                  type="button"
                  onClick={() => setCriteria('Extract project milestones, delivery deadlines, and target dates')}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors shadow-2xs"
                >
                  Milestones & Dates
                </button>
                <button
                  type="button"
                  onClick={() => setCriteria('Extract technical issues, calibrations, and firmware fixes')}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors shadow-2xs"
                >
                  Technical Calibrations
                </button>
                <button
                  type="button"
                  onClick={() => setCriteria('Extract committee votes, licensing costs, and assigned action items')}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors shadow-2xs"
                >
                  Action Items
                </button>
              </div>

              {/* Prompt Input Field */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="e.g. Extract only project deadlines, numeric percentages, and budget allocations..."
                  className="w-full text-xs pl-8 pr-8 py-2 rounded-lg border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-400 text-gray-800 transition-all"
                  id="input-criteria"
                />
                {criteria && (
                  <button
                    onClick={() => setCriteria('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded"
                    title="Clear prompt"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">{inputText.trim() ? inputText.trim().split(/\s+/).length.toLocaleString() : '0'} words</span>
              <span>·</span>
              <span className="text-gray-400">{inputText.length.toLocaleString()} characters</span>
            </div>

            <button
              onClick={handleExtract}
              disabled={isExtracting || !inputText.trim()}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98]"
              id="btn-extract-chunks"
            >
              {isExtracting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Extracting Verbatim Quotes...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Extract Quotes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Draggable Resizer Bar (Desktop) */}
        {isRightPanelOpen && (
          <div
            onMouseDown={handleMouseDown}
            className={`hidden lg:flex w-2.5 relative items-center justify-center bg-gray-100 hover:bg-blue-100 active:bg-blue-200 cursor-col-resize select-none border-x border-gray-200 z-20 group transition-colors ${
              isDragging ? 'bg-blue-200' : ''
            }`}
            title="Drag left or right to resize panels"
            id="workspace-drag-resizer"
          >
            {/* Center Handle Indicator */}
            <div className="w-1 h-8 rounded-full bg-gray-300 group-hover:bg-blue-500 transition-colors flex items-center justify-center">
              <GripVertical className="w-2.5 h-2.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Quick Collapse Button floating on the splitter */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRightPanelOpen(false);
              }}
              className="absolute top-12 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-xs flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity z-30"
              title="Collapse quotes panel"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right Column: Extracted Entities (Slides in/out) */}
        {isRightPanelOpen && (
          <div 
            style={{ 
              width: `${100 - splitRatio}%`,
            }}
            className="bg-[#F8FAFC] flex flex-col h-full overflow-hidden border-t lg:border-t-0 border-gray-200 min-w-[320px] transition-[width] duration-75"
          >
            {/* Quick Search & Layout Toolbar */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white space-y-3.5 shadow-sm shrink-0">
              {/* Top Toolbar Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Quick Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Quick search quotes, categories, or keywords..."
                    className="w-full pl-10 pr-9 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400"
                    id="input-quick-search-facts"
                  />
                  {quickSearch && (
                    <button
                      onClick={() => setQuickSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* View Toggle & Select All Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Select All Toggle Button */}
                  {filteredEntities.length > 0 && (
                    <button
                      onClick={toggleSelectAllFiltered}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border active:scale-[0.98] shadow-xs ${
                        isAllFilteredSelected
                          ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                      id="btn-select-all-toggle"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{isAllFilteredSelected ? 'Deselect All' : 'Select All'}</span>
                    </button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                        viewMode === 'cards'
                          ? 'bg-white text-gray-900 shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                      title="Detailed Card View"
                      id="btn-view-cards"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                        viewMode === 'compact'
                          ? 'bg-white text-gray-900 shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                      title="Dense List View"
                      id="btn-view-compact"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Pills & Category Row */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                {/* Confidence Filters */}
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs border active:scale-[0.98] ${
                      selectedFilter === 'all'
                        ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    id="filter-pill-all"
                  >
                    All ({entities.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('strong')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 text-xs border active:scale-[0.98] ${
                      selectedFilter === 'strong'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-emerald-700 border-gray-200 hover:bg-emerald-50/50'
                    }`}
                    id="filter-pill-strong"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedFilter === 'strong' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    High ({stats.high})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('partial')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 text-xs border active:scale-[0.98] ${
                      selectedFilter === 'partial'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-amber-700 border-gray-200 hover:bg-amber-50/50'
                    }`}
                    id="filter-pill-partial"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedFilter === 'partial' ? 'bg-white' : 'bg-amber-500'}`}></span>
                    Moderate ({stats.moderate})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('weak')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 text-xs border active:scale-[0.98] ${
                      selectedFilter === 'weak'
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'bg-white text-red-700 border-gray-200 hover:bg-red-50/50'
                    }`}
                    id="filter-pill-weak"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedFilter === 'weak' ? 'bg-white' : 'bg-red-500'}`}></span>
                    Review ({stats.needsReview})
                  </button>
                </div>

                {/* Category Dropdown Filter */}
                {availableCategories.length > 1 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="text-xs font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-400 transition-all shadow-2xs"
                      id="select-category-filter"
                    >
                      <option value="all">All Categories</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

          {/* Selection Banner & Quick Metrics Strip */}
          <div className="bg-gray-50/80 border-b border-gray-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* Left Status & Selection Summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-gray-600 font-medium">
                Showing <strong className="text-gray-900">{filteredEntities.length}</strong> of <strong className="text-gray-900">{entities.length}</strong> quotes
              </span>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100/80 text-blue-800 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    {selectedIds.size} Selected
                  </span>

                  {/* Copy Selected Button (Free tier) */}
                  <button
                    onClick={handleCopySelectedRaw}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition-all shadow-xs"
                    id="btn-copy-selected-strip"
                    title="Copy raw text of selected quotes to clipboard (Free Tier)"
                  >
                    {copiedSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Selected</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {quickSearch && !selectedIds.size && (
                <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Matching "{quickSearch}"
                </span>
              )}
            </div>

            {/* Right Confidence Summary */}
            <div className="flex items-center gap-2">
              {extractionModelNotice && (
                <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200" title={extractionModelNotice}>
                  {extractionModelNotice}
                </span>
              )}
              <span className="text-gray-500 font-medium">Average Confidence:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-gray-900 border border-gray-200 shadow-2xs">
                <span className={`w-2 h-2 rounded-full ${stats.avgScore >= 85 ? 'bg-emerald-500' : stats.avgScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                {stats.avgScore}%
              </span>
            </div>
          </div>

          {/* Bulk chunk-action panel (appears when chunks are selected) */}
          {selectedIds.size > 0 && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50/60 to-blue-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="flex items-center gap-2 shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-900">
                    Do something with {selectedIds.size} selected chunk{selectedIds.size === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={bulkInstruction}
                    onChange={(e) => setBulkInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !bulkActionLoading) handleBulkAction(); }}
                    placeholder="e.g. Summarize, extract action items, translate to French, draft an email…"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    id="input-bulk-chunk-instruction"
                  />
                  <button
                    onClick={handleBulkAction}
                    disabled={bulkActionLoading || !bulkInstruction.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white transition-all shadow-xs disabled:opacity-50"
                    id="btn-bulk-chunk-action"
                  >
                    {bulkActionLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>{bulkActionLoading ? 'Working…' : 'Run'}</span>
                  </button>
                </div>
              </div>

              {bulkActionError && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {bulkActionError}
                </div>
              )}

              {bulkActionResult && (
                <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/70">
                    <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Result</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { navigator.clipboard.writeText(bulkActionResult); }}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                        title="Copy result"
                        id="btn-copy-bulk-result"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setBulkActionResult(null)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Dismiss"
                        id="btn-dismiss-bulk-result"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto" id="bulk-action-result">
                    {bulkActionResult}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Extracted Data Container */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredEntities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">No matching quotes found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  {quickSearch 
                    ? `No quotes matched "${quickSearch}". Try a different search term or clear the filter.`
                    : 'Paste source text in the editor and click "Extract Entities" to isolate key quotes.'}
                </p>
                {quickSearch && (
                  <button
                    onClick={() => setQuickSearch('')}
                    className="mt-4 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-lg transition-colors"
                  >
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : viewMode === 'cards' ? (
              /* CARD VIEW LAYOUT */
              <div className="space-y-3.5">
                {filteredEntities.map((chunk) => {
                  const isEditing = editingChunkId === chunk.id;
                  const isSelected = selectedIds.has(chunk.id);

                  return (
                    <div
                      key={chunk.id}
                      className={`bg-white rounded-xl border transition-all p-4 ${
                        isSelected 
                          ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm bg-blue-50/20' 
                          : 'border-gray-200 hover:border-gray-300 shadow-sm'
                      }`}
                      id={`chunk-card-${chunk.id}`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editChunkCategory}
                              onChange={(e) => setEditChunkCategory(e.target.value)}
                              className="text-xs font-bold uppercase tracking-wider px-2 py-1 border border-gray-300 rounded"
                              placeholder="CATEGORY"
                            />
                          </div>
                          <textarea
                            value={editChunkText}
                            onChange={(e) => setEditChunkText(e.target.value)}
                            rows={3}
                            className="w-full text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingChunkId(null)}
                              className="text-xs px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(chunk.id)}
                              className="text-xs px-3 py-1 bg-blue-600 text-white rounded font-medium"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Top Card Row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              {/* Selection Checkbox */}
                              <button
                                onClick={() => toggleSelectChunk(chunk.id)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title={isSelected ? 'Deselect quote' : 'Select quote'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                                )}
                              </button>

                              <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${getCategoryBadgeClass(chunk.category)}`}>
                                {chunk.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getScoreBadge(chunk.score, chunk.level)}
                            </div>
                          </div>

                          {/* Verbatim Content */}
                          <p className="text-sm font-medium text-gray-900 leading-relaxed font-sans pl-6">
                            "{chunk.verbatimText}"
                          </p>

                          {/* Note / Context info if available */}
                          {chunk.note && (
                            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-start gap-1.5 text-[11px] text-gray-500 pl-6">
                              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span>{chunk.note}</span>
                            </div>
                          )}

                          {/* Card Action Controls */}
                          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyChunk(chunk)}
                              className="px-2.5 py-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 active:scale-95 transition-all flex items-center gap-1.5 text-[11px] font-medium border border-transparent hover:border-gray-200"
                              id={`btn-copy-chunk-${chunk.id}`}
                              title="Copy quote"
                            >
                              {copiedId === chunk.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600 font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setEditingChunkId(chunk.id);
                                setEditChunkText(chunk.verbatimText);
                                setEditChunkCategory(chunk.category);
                              }}
                              className="px-2.5 py-1 text-gray-500 hover:text-blue-700 rounded-lg hover:bg-blue-50/80 active:scale-95 transition-all flex items-center gap-1.5 text-[11px] font-medium border border-transparent hover:border-blue-100"
                              id={`btn-edit-chunk-${chunk.id}`}
                              title="Edit quote"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => setChunkActionOpen(chunkActionOpen === chunk.id ? null : chunk.id)}
                              className="px-2.5 py-1 text-gray-500 hover:text-indigo-700 rounded-lg hover:bg-indigo-50/80 active:scale-95 transition-all flex items-center gap-1.5 text-[11px] font-medium border border-transparent hover:border-indigo-100"
                              id={`btn-chunk-action-${chunk.id}`}
                              title="Do something with this chunk"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                              <span>Act</span>
                            </button>

                            <button
                              onClick={() => handleDeleteChunk(chunk.id)}
                              className="px-2 py-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50/80 active:scale-95 transition-all flex items-center gap-1 text-[11px] border border-transparent hover:border-red-100"
                              id={`btn-delete-chunk-${chunk.id}`}
                              title="Delete quote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Per-chunk free-text instruction action */}
                          {chunkActionOpen === chunk.id && (
                            <div className="mt-3 p-3 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={chunkInstruction[chunk.id] || ''}
                                  onChange={(e) => setChunkInstruction((p) => ({ ...p, [chunk.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !chunkActionLoading[chunk.id]) handleSingleChunkAction(chunk.id); }}
                                  placeholder="Instruction for this chunk (e.g. explain, rephrase, find related dates)…"
                                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                                  id={`input-chunk-action-${chunk.id}`}
                                />
                                <button
                                  onClick={() => handleSingleChunkAction(chunk.id)}
                                  disabled={chunkActionLoading[chunk.id] || !(chunkInstruction[chunk.id] || '').trim()}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50"
                                  id={`btn-run-chunk-action-${chunk.id}`}
                                >
                                  {chunkActionLoading[chunk.id] ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  )}
                                  <span>Run</span>
                                </button>
                              </div>
                              {chunkActionResult[chunk.id] && (
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100 bg-gray-50/70">
                                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Result</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => navigator.clipboard.writeText(chunkActionResult[chunk.id])}
                                        className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                                        title="Copy result"
                                        id={`btn-copy-chunk-action-${chunk.id}`}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setChunkActionResult((p) => { const n = { ...p }; delete n[chunk.id]; return n; })}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                        title="Dismiss"
                                        id={`btn-dismiss-chunk-action-${chunk.id}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <pre className="p-3 text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto" id={`chunk-action-result-${chunk.id}`}>
                                    {chunkActionResult[chunk.id]}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DENSE COMPACT LIST / TABLE VIEW */
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <button
                          onClick={toggleSelectAllFiltered}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          {isAllFilteredSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-4">Verbatim Quote</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntities.map((chunk) => {
                      const isSelected = selectedIds.has(chunk.id);
                      return (
                        <tr 
                          key={chunk.id} 
                          className={`transition-colors group ${
                            isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'
                          }`}
                        >
                          <td className="py-3 px-3 align-top">
                            <button
                              onClick={() => toggleSelectChunk(chunk.id)}
                              className="text-gray-400 hover:text-blue-600 mt-0.5"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-gray-300" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap align-top">
                            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${getCategoryBadgeClass(chunk.category)}`}>
                              {chunk.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-medium text-gray-900 leading-normal">
                              "{chunk.verbatimText}"
                            </div>
                            {chunk.note && (
                              <div className="text-[11px] text-gray-400 mt-0.5">{chunk.note}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap align-top">
                            {getScoreBadge(chunk.score, chunk.level)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-right align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCopyChunk(chunk)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                                title="Copy quote"
                              >
                                {copiedId === chunk.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteChunk(chunk.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Delete quote"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Verbatim Document Compilation Modal */}
      <VerbatimDocumentModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        quotes={quotesToCompile}
        sourceTitle={title}
      />
    </div>
  );
};
