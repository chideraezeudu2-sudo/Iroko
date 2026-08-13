import React, { useState, useMemo } from 'react';
import { ExtractionRecord, PageView } from '../types';
import { 
  Search, 
  ArrowUpDown, 
  Trash2, 
  Calendar, 
  Layers,
  FileText,
  Plus,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';

interface HistoryScreenProps {
  records: ExtractionRecord[];
  onSelectRecord: (record: ExtractionRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNavigate: (page: PageView) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  records,
  onSelectRecord,
  onDeleteRecord,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'volume' | 'title'>('date');

  // Filter and Sort
  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(query);
        const matchesInput = r.rawInput.toLowerCase().includes(query);
        const matchesEntities = (r.entities || []).some(
          e => e.verbatimText.toLowerCase().includes(query) || e.category.toLowerCase().includes(query)
        );
        return matchesTitle || matchesInput || matchesEntities;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime();
        }
        if (sortBy === 'volume') {
          return (b.entities?.length || b.volume) - (a.entities?.length || a.volume);
        }
        return a.title.localeCompare(b.title);
      });
  }, [records, searchQuery, sortBy]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const totalQuotesCount = useMemo(() => {
    return records.reduce((acc, r) => acc + (r.entities?.length || r.volume || 0), 0);
  }, [records]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-gray-50/60 p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Extraction Archive</h1>
            <p className="text-xs text-gray-500 mt-1">
              Review, filter, and reopen your saved extractions and verbatim source quotes.
            </p>
          </div>

          <button
            onClick={() => onNavigate('extract')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98]"
            id="btn-history-new-extract"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Extraction</span>
          </button>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Saved Documents</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{records.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Total Entities Isolated</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalQuotesCount}</div>
          </div>
        </div>

        {/* Search and Sort Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Quick Search Field */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, source text, or quotes..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50/50 focus:bg-white transition-colors"
              id="input-history-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-blue-500 font-medium"
              id="select-history-sort"
            >
              <option value="date">Most Recent</option>
              <option value="volume">Entity Count</option>
              <option value="title">Alphabetical (A to Z)</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No archived extractions found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery 
                  ? `No records matched "${searchQuery}". Try another keyword or clear search.`
                  : 'Start a new extraction in the workspace to save entities here.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-lg transition-colors"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Document Title & Excerpt</th>
                    <th className="py-3.5 px-6">Date Saved</th>
                    <th className="py-3.5 px-6">Entities Isolated</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((record) => {
                    const chunkCount = record.entities?.length || record.volume || 0;
                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                        onClick={() => {
                          onSelectRecord(record);
                          onNavigate('extract');
                        }}
                        id={`history-row-${record.id}`}
                      >
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {record.title}
                              </div>
                              <div className="text-[11px] text-gray-400 font-normal line-clamp-1 max-w-md mt-0.5">
                                {record.rawInput}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatDate(record.extractedAt)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                            {chunkCount} {chunkCount === 1 ? 'entity' : 'entities'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                onSelectRecord(record);
                                onNavigate('extract');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                              id={`btn-open-${record.id}`}
                            >
                              <span>Open</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteRecord(record.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete record"
                              id={`btn-delete-${record.id}`}
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
    </div>
  );
};
