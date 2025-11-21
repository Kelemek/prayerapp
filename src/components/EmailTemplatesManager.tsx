import React, { useEffect, useState } from 'react'
import type { EmailTemplate } from '../lib/emailService'
import { getAllTemplates, updateTemplate } from '../lib/emailService'
import { Eye, EyeOff, Save, RefreshCw, Mail } from 'lucide-react'

export const EmailTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllTemplates()
      console.log('Loaded templates:', data)
      setTemplates(data)
      if (data.length === 0) {
        setError('No templates found. Please run the database migration.')
      }
      // Don't auto-select a template - let user choose one
      setSelectedTemplate(null)
      setEditedTemplate(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to load templates:', err)
      setError(`Failed to load templates: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = (template: EmailTemplate) => {
    // If clicking the same template, toggle the editor off
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null)
      setEditedTemplate(null)
      setShowPreview(false)
    } else {
      // Open editor for the clicked template
      setSelectedTemplate(template)
      setEditedTemplate(template)
      setShowPreview(false)
    }
    setSuccess(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editedTemplate) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateTemplate(editedTemplate.id, {
        name: editedTemplate.name,
        subject: editedTemplate.subject,
        html_body: editedTemplate.html_body,
        text_body: editedTemplate.text_body,
        description: editedTemplate.description
      })

      if (updated) {
        setSelectedTemplate(updated)
        setEditedTemplate(updated)
        setTemplates(templates.map(t => t.id === updated.id ? updated : t))
        setSuccess('Template saved successfully!')
      }
    } catch (err) {
      setError('Failed to save template')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleRevert = () => {
    if (selectedTemplate) {
      setEditedTemplate(selectedTemplate)
      setSuccess(null)
      setError(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
      </div>
    )
  }

  if (error && templates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Templates</h3>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-4">
          <p className="text-red-800 dark:text-red-200"><strong>Error:</strong> {error}</p>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">Please execute the database migration in Supabase SQL Editor to enable email templates.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail size={24} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h3>
        </div>
        <button
          onClick={loadTemplates}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh templates"
        >
          <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {error && templates.length > 0 && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-3">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">{error}</p>
        </div>
      )}

      {/* Templates List */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Available Templates</label>
        {templates.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">No templates available</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id}>
                {/* Template Card */}
                <button
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{template.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{template.template_key}</div>
                </button>

                {/* Editor - appears under selected template */}
                {selectedTemplate?.id === template.id && editedTemplate && (
                  <div className="mt-3 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Preview/Edit Toggle */}
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-gray-900 dark:text-white">Edit Template</label>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        {showPreview ? (
                          <>
                            <EyeOff size={16} />
                            Edit
                          </>
                        ) : (
                          <>
                            <Eye size={16} />
                            Preview
                          </>
                        )}
                      </button>
                    </div>

                    {showPreview ? (
                      // Preview Mode
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Subject:
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                            {editedTemplate.subject}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            HTML Preview:
                          </label>
                          <div
                            className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-auto max-h-64 text-sm"
                            dangerouslySetInnerHTML={{ __html: editedTemplate.html_body }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Text Preview:
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg whitespace-pre-wrap font-mono text-xs text-gray-600 dark:text-gray-300 max-h-64 overflow-auto">
                            {editedTemplate.text_body}
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2"><strong>Available variables:</strong></p>
                          <p className="text-xs text-blue-800 dark:text-blue-300 break-words">
                            {'{{name}}'}, {'{{email}}'}, {'{{code}}'}, {'{{prayerTitle}}'}, {'{{prayerDescription}}'}, {'{{updateContent}}'}, {'{{requesterName}}'}, {'{{authorName}}'}, {'{{prayerFor}}'}, {'{{status}}'}, {'{{actionDescription}}'}, {'{{denialReason}}'}, {'{{adminLink}}'}, {'{{appLink}}'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Edit Mode
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Human-readable title for this email template (for admin reference only)</p>
                          <input
                            type="text"
                            value={editedTemplate.name}
                            onChange={(e) =>
                              setEditedTemplate({ ...editedTemplate, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Template Key <span className="text-gray-500">(read-only)</span>
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Unique identifier used to reference this template in the system</p>
                          <div className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 font-mono text-xs text-gray-600 dark:text-gray-400">
                            {editedTemplate.template_key}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">The subject line users see in their email inbox. Include variables like name, code, or title for dynamic content</p>
                          <input
                            type="text"
                            value={editedTemplate.subject}
                            onChange={(e) =>
                              setEditedTemplate({ ...editedTemplate, subject: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="Subject with {{variables}}"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">HTML Body</label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">The formatted email content with styling, colors, and layout. What most users see when opening the email</p>
                          <textarea
                            value={editedTemplate.html_body}
                            onChange={(e) =>
                              setEditedTemplate({ ...editedTemplate, html_body: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
                            rows={8}
                            placeholder="HTML content with {{variables}}"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Text Body</label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Plain text version without formatting. Used for basic email clients and accessibility. Should match the HTML version</p>
                          <textarea
                            value={editedTemplate.text_body}
                            onChange={(e) =>
                              setEditedTemplate({ ...editedTemplate, text_body: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
                            rows={6}
                            placeholder="Plain text content with {{variables}}"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Internal note explaining when and why this email is sent. For admin reference only</p>
                          <input
                            type="text"
                            value={editedTemplate.description || ''}
                            onChange={(e) =>
                              setEditedTemplate({ ...editedTemplate, description: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="Template description"
                          />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2"><strong>Available variables:</strong></p>
                          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                            <li>• {'{{name}}'} - User or admin name</li>
                            <li>• {'{{email}}'} - Email address</li>
                            <li>• {'{{code}}'} - Verification code</li>
                            <li>• {'{{prayerTitle}}'} - Prayer title (used in all prayer-related emails)</li>
                            <li>• {'{{prayerDescription}}'} - Original prayer description/content</li>
                            <li>• {'{{updateContent}}'} - Prayer update content</li>
                            <li>• {'{{requesterName}}'} - Name of person who submitted prayer</li>
                            <li>• {'{{authorName}}'} - Name of person who posted update</li>
                            <li>• {'{{prayerFor}}'} - Who the prayer is for</li>
                            <li>• {'{{status}}'} - Prayer status (Current/Ongoing/Answered/Archived)</li>
                            <li>• {'{{denialReason}}'} - Reason for prayer/update denial</li>
                            <li>• {'{{actionDescription}}'} - Description of verification action</li>
                            <li>• {'{{adminLink}}'} - Link to admin portal</li>
                            <li>• {'{{appLink}}'} - Link to prayer app</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-200 text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-green-700 dark:text-green-200 text-sm">
                        {success}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleRevert}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        Revert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
