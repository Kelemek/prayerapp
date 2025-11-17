import React, { useState, useEffect } from 'react';
import { Plus, Upload, X, Lightbulb, Search, Tag, Trash2, Edit2, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PrayerType } from '../types/prayer';
import type { PrayerPrompt, PrayerTypeRecord } from '../types/prayer';

// Prayer prompt management component
interface PromptManagerProps {
  onSuccess: () => void;
}

interface CSVRow {
  title: string;
  type: PrayerType;
  description: string;
  valid: boolean;
  error?: string;
}

export const PromptManager: React.FC<PromptManagerProps> = ({ onSuccess }) => {
  const [prompts, setPrompts] = useState<PrayerPrompt[]>([]);
  const [prayerTypes, setPrayerTypes] = useState<PrayerTypeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch prayer types on mount
  useEffect(() => {
    fetchPrayerTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrayerTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('prayer_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPrayerTypes(data || []);
      // Set default type to first active type
      if (data && data.length > 0 && !type) {
        setType(data[0].name);
      }
    } catch (err: unknown) {
      console.error('Error fetching prayer types:', err);
    }
  };

  // Search prompts
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      setSearching(true);
      setError(null);
      setSuccess(null);
      setHasSearched(true);

      const query = searchQuery.trim().toLowerCase();
      
      let dbQuery = supabase
        .from('prayer_prompts')
        .select('*');
      
      // If search query is provided, filter by it; otherwise return all
      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,type.ilike.%${query}%,description.ilike.%${query}%`);
      }
      
      const { data, error } = await dbQuery
        .order('type', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setPrompts(data || []);
    } catch (err: unknown) {
      console.error('Error searching prompts:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Failed to search prompts';
      setError(errorMessage);
    } finally {
      setSearching(false);
    }
  };

  // Add or update prompt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (editingId) {
        // Update existing prompt
        const { error } = await supabase
          .from('prayer_prompts')
          .update({
            title: title.trim(),
            type,
            description: description.trim()
          })
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('Prayer prompt updated successfully!');
      } else {
        // Add new prompt
        const { error } = await supabase
          .from('prayer_prompts')
          .insert({
            title: title.trim(),
            type,
            description: description.trim()
          });

        if (error) throw error;
        setSuccess('Prayer prompt added successfully!');
      }

      // Reset form
      setTitle('');
      setDescription('');
      setType(prayerTypes.length > 0 ? prayerTypes[0].name : '');
      setEditingId(null);
      setShowAddForm(false);
      
      // Refresh search if we have a query
      if (searchQuery.trim()) {
        await handleSearch();
      }
      
      onSuccess();
    } catch (err: unknown) {
      console.error('Error saving prompt:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      setError(`Failed to save prayer prompt: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Load prompt for editing
  const handleEdit = (prompt: PrayerPrompt) => {
    setTitle(prompt.title);
    setType(prompt.type);
    setDescription(prompt.description);
    setEditingId(prompt.id);
    setShowAddForm(false); // Don't show the top form
    setShowCSVUpload(false);
    setError(null);
    setSuccess(null);
  };

  // Delete prompt
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('prayer_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Prayer prompt deleted successfully!');
      
      // Refresh search results
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (err: unknown) {
      console.error('Error deleting prompt:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Failed to delete prompt';
      setError(errorMessage);
    }
  };

  // Handle CSV file upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setSuccess(null);
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row if it exists
      const startIndex = lines[0].toLowerCase().includes('title') ? 1 : 0;
      
      const rows: CSVRow[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quoted fields)
        const fields = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
        if (!fields || fields.length < 3) {
          rows.push({
            title: line,
            type: (prayerTypes.length > 0 ? prayerTypes[0].name : 'Other') as PrayerType,
            description: '',
            valid: false,
            error: 'Invalid format (need 3 columns)'
          });
          continue;
        }

        const [titleField, typeField, descriptionField] = fields.map(f => 
          f.replace(/^"|"$/g, '').trim()
        );

        // Validate type against active prayer types
        const validTypeNames = prayerTypes.map(t => t.name);
        const promptType = validTypeNames.includes(typeField) 
          ? typeField as PrayerType 
          : (prayerTypes.length > 0 ? prayerTypes[0].name as PrayerType : 'Other' as PrayerType);

        // Validate required fields
        if (!titleField || !descriptionField) {
          rows.push({
            title: titleField || '(missing)',
            type: promptType,
            description: descriptionField || '(missing)',
            valid: false,
            error: 'Title and description required'
          });
          continue;
        }

        rows.push({
          title: titleField,
          type: promptType,
          description: descriptionField,
          valid: true
        });
      }

      setCSVData(rows);
    } catch (err: unknown) {
      console.error('Error reading CSV:', err);
      setError('Failed to read CSV file. Please check the format.');
    }

    // Reset file input
    e.target.value = '';
  };

  // Upload CSV data
  const handleUploadCSV = async () => {
    const validRows = csvData.filter(row => row.valid);
    
    if (validRows.length === 0) {
      setError('No valid rows to upload. Please fix errors in your CSV.');
      return;
    }

    try {
      setUploadingCSV(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('prayer_prompts')
        .insert(
          validRows.map(row => ({
            title: row.title,
            type: row.type,
            description: row.description
          }))
        );

      if (error) throw error;

      setSuccess(`Successfully added ${validRows.length} prayer prompt(s)!`);
      setCSVData([]);
      setShowCSVUpload(false);
      
      // Refresh search if we have a query
      if (searchQuery.trim()) {
        await handleSearch();
      }
      
      onSuccess();
    } catch (err: unknown) {
      console.error('Error uploading CSV:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Failed to upload CSV';
      setError(errorMessage);
    } finally {
      setUploadingCSV(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-yellow-600 dark:text-yellow-400" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Prayer Prompts
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setShowCSVUpload(!showCSVUpload);
              setShowAddForm(false);
              setError(null);
              setSuccess(null);
              setCSVData([]);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
          >
            <Upload size={18} />
            Upload CSV
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowCSVUpload(false);
              setEditingId(null);
              setTitle('');
              setDescription('');
              setType(prayerTypes.length > 0 ? prayerTypes[0].name : '');
              setError(null);
              setSuccess(null);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Add Prompt
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Search for prayer prompts by title, type, or description, or upload a CSV file to add multiple prompts.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts by title, type, or description..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">Upload CSV File</h4>
            <button
              onClick={() => {
                setShowCSVUpload(false);
                setCSVData([]);
                setError(null);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">CSV Format:</p>
                  <p className="mb-2">Your CSV file should have three columns: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">Title,Type,Description</code></p>
                  <p className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                    "Pray for healing","Healing","Lord, we lift up..."<br />
                    "Pray for guidance","Guidance","Father, guide us..."
                  </p>
                  <p className="mt-2"><strong>Valid Types:</strong> {prayerTypes.map(t => t.name).join(', ') || 'Loading...'}</p>
                </div>
              </div>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
            />
          </div>

          {csvData.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview ({csvData.length} rows found, {csvData.filter(r => r.valid).length} valid)
              </h5>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Title</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Type</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Description</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row, index) => (
                      <tr key={index} className={`border-t border-gray-200 dark:border-gray-700 ${!row.valid ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{row.title}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{row.type}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100 truncate max-w-xs">{row.description}</td>
                        <td className="p-2">
                          {row.valid ? (
                            <span className="text-green-600 dark:text-green-400 text-xs">✓ Valid</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleUploadCSV}
                  disabled={uploadingCSV || csvData.filter(r => r.valid).length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm"
                >
                  {uploadingCSV ? 'Uploading...' : `Upload ${csvData.filter(r => r.valid).length} Prompt(s)`}
                </button>
                <button
                  onClick={() => setCSVData([])}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Prompt Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? 'Edit Prayer Prompt' : 'Add New Prayer Prompt'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setTitle('');
                setDescription('');
                setType(prayerTypes.length > 0 ? prayerTypes[0].name : '');
                setError(null);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Pray for those in need"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                >
                  {prayerTypes.length === 0 && <option value="">Loading types...</option>}
                  {prayerTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={20} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a prayer or meditation prompt..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Prompt' : 'Add Prompt'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setTitle('');
                setDescription('');
                setType(prayerTypes.length > 0 ? prayerTypes[0].name : '');
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Prompts List */}
      {searching ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Searching...</p>
        </div>
      ) : !hasSearched ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Search size={48} className="mx-auto mb-2 opacity-50" />
          <p>Enter a search term to find prompts</p>
          <p className="text-sm mt-1">Search results will appear here</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Lightbulb size={48} className="mx-auto mb-2 opacity-50" />
          <p>No prayer prompts found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <div key={prompt.id}>
                {editingId === prompt.id ? (
                  // Inline Edit Form
                  <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-blue-300 dark:border-blue-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                        Edit Prayer Prompt
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setTitle('');
                          setDescription('');
                          setType(prayerTypes.length > 0 ? prayerTypes[0].name : '');
                          setError(null);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., Pray for those in need"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type *
                        </label>
                        <div className="relative">
                          <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                          >
                            {prayerTypes.length === 0 && <option value="">Loading types...</option>}
                            {prayerTypes.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={20} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description *
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Write a prayer or meditation prompt..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
                      >
                        {submitting ? 'Saving...' : 'Update Prompt'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setTitle('');
                          setDescription('');
                          setType(prayerTypes.length > 0 ? prayerTypes[0].name : '');
                          setError(null);
                        }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // Regular Prompt Card
                  <div className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {prompt.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                          <Tag size={12} />
                          {prompt.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {prompt.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Added {new Date(prompt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(prompt)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id, prompt.title)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Found: <span className="font-semibold">{prompts.length}</span> prompt(s)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
