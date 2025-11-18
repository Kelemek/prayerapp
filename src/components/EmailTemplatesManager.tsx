import React, { useEffect, useState } from 'react'
import type { EmailTemplate } from '../lib/emailService'
import { getAllTemplates, updateTemplate } from '../lib/emailService'
import { useTheme } from '../hooks/useTheme'

export const EmailTemplatesManager: React.FC = () => {
  const { isDark } = useTheme()
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
    try {
      const data = await getAllTemplates()
      setTemplates(data)
      if (data.length > 0) {
        setSelectedTemplate(data[0])
        setEditedTemplate(data[0])
      }
    } catch (err) {
      setError('Failed to load templates')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEditedTemplate(template)
    setShowPreview(false)
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

  const bgClass = isDark ? 'bg-gray-800' : 'bg-white'
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200'
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900'
  const secondaryTextClass = isDark ? 'text-gray-400' : 'text-gray-600'
  const inputClass = isDark
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-200 text-gray-900'
  const selectClass = isDark
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-200 text-gray-900'

  if (loading) {
    return (
      <div className={`${bgClass} rounded-lg border ${borderClass} p-6 text-center`}>
        <p className={secondaryTextClass}>Loading templates...</p>
      </div>
    )
  }

  return (
    <div className={`${bgClass} rounded-lg border ${borderClass} p-6`}>
      <h2 className={`text-2xl font-bold ${textClass} mb-6`}>Email Templates</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div>
          <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Available Templates</h3>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? isDark
                      ? 'bg-blue-900 border-blue-500'
                      : 'bg-blue-100 border-blue-300'
                    : isDark
                    ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-700'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold">{template.name}</div>
                <div className={`text-sm ${secondaryTextClass}`}>{template.template_key}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        {editedTemplate && (
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${textClass}`}>Edit Template</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {showPreview ? (
              // Preview Mode
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>
                    Subject Preview:
                  </label>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={textClass}>{editedTemplate.subject}</p>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>
                    HTML Preview:
                  </label>
                  <div
                    className={`p-4 rounded-lg border ${borderClass} overflow-auto max-h-96`}
                    dangerouslySetInnerHTML={{ __html: editedTemplate.html_body }}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>
                    Text Preview:
                  </label>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} whitespace-pre-wrap font-mono text-sm`}>
                    <p className={secondaryTextClass}>{editedTemplate.text_body}</p>
                  </div>
                </div>

                <div className={`text-xs ${secondaryTextClass}`}>
                  <p><strong>Available variables:</strong></p>
                  <p>{'{{name}}'}, {'{{email}}'}, {'{{code}}'}, {'{{title}}'}, {'{{description}}'}, {'{{requester}}'}, {'{{prayerFor}}'}, {'{{content}}'}, {'{{author}}'}, {'{{actionDescription}}'}, {'{{adminLink}}'}, {'{{appLink}}'}</p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>Name</label>
                  <input
                    type="text"
                    value={editedTemplate.name}
                    onChange={(e) =>
                      setEditedTemplate({ ...editedTemplate, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg ${inputClass}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>
                    Template Key <span className={secondaryTextClass}>(read-only)</span>
                  </label>
                  <div className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} font-mono text-sm`}>
                    {editedTemplate.template_key}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>Subject</label>
                  <input
                    type="text"
                    value={editedTemplate.subject}
                    onChange={(e) =>
                      setEditedTemplate({ ...editedTemplate, subject: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg ${inputClass}`}
                    placeholder="Subject with {{variables}}"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>HTML Body</label>
                  <textarea
                    value={editedTemplate.html_body}
                    onChange={(e) =>
                      setEditedTemplate({ ...editedTemplate, html_body: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${inputClass}`}
                    rows={10}
                    placeholder="HTML content with {{variables}}"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>Text Body</label>
                  <textarea
                    value={editedTemplate.text_body}
                    onChange={(e) =>
                      setEditedTemplate({ ...editedTemplate, text_body: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${inputClass}`}
                    rows={8}
                    placeholder="Plain text content with {{variables}}"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textClass} mb-2`}>Description</label>
                  <input
                    type="text"
                    value={editedTemplate.description || ''}
                    onChange={(e) =>
                      setEditedTemplate({ ...editedTemplate, description: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg ${inputClass}`}
                    placeholder="Template description"
                  />
                </div>

                <div className={`text-xs ${secondaryTextClass} bg-gray-900 bg-opacity-10 p-3 rounded`}>
                  <p><strong>Use these variables in your template:</strong></p>
                  <ul className="mt-2 space-y-1">
                    <li>• {'{{name}}'} - User or admin name</li>
                    <li>• {'{{email}}'} - Email address</li>
                    <li>• {'{{code}}'} - Verification code</li>
                    <li>• {'{{title}}'} - Prayer or update title</li>
                    <li>• {'{{description}}'} - Prayer description</li>
                    <li>• {'{{content}}'} - Prayer update content</li>
                    <li>• {'{{requester}}'} - Prayer requester name</li>
                    <li>• {'{{author}}'} - Update author name</li>
                    <li>• {'{{prayerFor}}'} - Who the prayer is for</li>
                    <li>• {'{{actionDescription}}'} - Action type description</li>
                    <li>• {'{{adminLink}}'} - Admin portal link</li>
                    <li>• {'{{appLink}}'} - App link</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded text-green-700">
                {success}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleRevert}
                className="px-4 py-2 border border-gray-400 rounded-lg hover:bg-gray-100 hover:dark:bg-gray-700"
              >
                Revert
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
