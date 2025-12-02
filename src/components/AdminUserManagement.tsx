import React, { useState, useEffect, useRef } from 'react';
import { Shield, UserPlus, Trash2, Mail, AlertCircle, CheckCircle, X, XCircle } from 'lucide-react';
import { supabase, directQuery } from '../lib/supabase';

interface AdminUser {
  email: string;
  name: string;
  created_at: string;
  last_sign_in_at: string | null;
  receive_admin_emails: boolean;
}

// Cache admin data outside component to persist across re-mounts
let cachedAdmins: AdminUser[] | null = null;

export const AdminUserManagement: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>(cachedAdmins || []);
  const [loading, setLoading] = useState(cachedAdmins === null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasLoadedRef = useRef(cachedAdmins !== null);
  
  // Add admin form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adding, setAdding] = useState(false);
  
  // Delete confirmation state
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Load admin users
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadAdmins();
    }
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use directQuery to avoid Supabase client hang after browser minimize
      const { data, error: fetchError } = await directQuery<AdminUser[]>('email_subscribers', {
        select: 'email,name,created_at,last_sign_in_at,receive_admin_emails',
        eq: { is_admin: true },
        order: { column: 'created_at', ascending: true },
        timeout: 15000
      });

      if (fetchError) throw fetchError;

      const adminData = data || [];
      setAdmins(adminData);
      cachedAdmins = adminData; // Cache for next mount
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading admins:', err);
      setError('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminName.trim()) {
      setError('Email and name are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      setSuccess(null);

      const email = newAdminEmail.toLowerCase().trim();
      const name = newAdminName.trim();

      // Check if admin already exists
      const { data: existing } = await supabase
        .from('email_subscribers')
        .select('email')
        .eq('email', email)
        .eq('is_admin', true)
        .maybeSingle();

      if (existing) {
        setError('This email is already an admin');
        return;
      }

      // Insert or update the admin
      const { error: upsertError } = await supabase
        .from('email_subscribers')
        .upsert({
          email,
          name,
          is_admin: true,
          is_active: true
        }, {
          onConflict: 'email'
        });

      if (upsertError) throw upsertError;

      // Send invitation email
      try {
        const { sendEmail } = await import('../lib/emailService');
        await sendEmail({
          to: email,
          subject: 'Admin Access Granted - Prayer App',
          htmlBody: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">🙏 Prayer App</h1>
                      <p style="margin: 10px 0 0 0;">Admin Access Granted</p>
                    </div>
                    <div class="content">
                      <h2>Welcome, ${name}!</h2>
                      <p>You've been granted admin access to the Prayer App. As an admin, you can:</p>
                      <ul>
                        <li>Review and approve prayer requests</li>
                        <li>Manage prayer updates and deletions</li>
                        <li>Configure email settings and subscribers</li>
                        <li>Manage prayer prompts and types</li>
                        <li>Access the full admin portal</li>
                      </ul>
                      
                      <p>To sign in to the admin portal:</p>
                      <ol>
                        <li>Go to the admin login page link at the bottom of the main site</li>
                        <li>Enter your email address: <strong>${email}</strong></li>
                        <li>Click "Send Magic Link"</li>
                        <li>Check your email for the secure sign-in link</li>
                      </ol>
                      
                      <div style="text-align: center;">
                        <a href="${window.location.origin}/#admin" class="button">Go to Admin Portal</a>
                      </div>
                      
                      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        <strong>Note:</strong> Prayer App uses passwordless authentication. You'll receive a magic link via email each time you sign in.
                      </p>
                    </div>
                    <div class="footer">
                      <p>Prayer App Admin Portal</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          textBody: `
Welcome to Prayer App Admin Portal!

Hi ${name},

You've been granted admin access to the Prayer App.

To sign in:
1. Go to ${window.location.origin}/#admin
2. Enter your email: ${email}
3. Click "Send Magic Link"
4. Check your email for the sign-in link

Prayer App uses passwordless authentication for security.

---
Prayer App Admin Portal
            `
        });
      } catch (emailErr) {
        console.warn('Error sending invitation email:', emailErr);
      }

      setSuccess(`Admin added successfully! Invitation email sent to ${email}`);
      setNewAdminEmail('');
      setNewAdminName('');
      setShowAddForm(false);
      loadAdmins();
    } catch (err) {
      console.error('Error adding admin:', err);
      setError('Failed to add admin user');
    } finally {
      setAdding(false);
    }
  };

  const deleteAdmin = async (email: string) => {
    try {
      setError(null);
      setSuccess(null);

      // Don't allow deleting the last admin
      if (admins.length === 1) {
        setError('Cannot delete the last admin user');
        return;
      }

      const { error: deleteError } = await supabase
        .from('email_subscribers')
        .update({ is_admin: false })
        .eq('email', email);

      if (deleteError) throw deleteError;

      setSuccess(`Admin access removed for ${email}`);
      setDeletingEmail(null);
      loadAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
      setError('Failed to remove admin access');
    }
  };

  const toggleReceiveEmails = async (email: string, currentStatus: boolean) => {
    try {
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('email_subscribers')
        .update({ receive_admin_emails: !currentStatus })
        .eq('email', email);

      if (updateError) throw updateError;

      loadAdmins();
    } catch (err) {
      console.error('Error toggling email preference:', err);
      setError('Failed to update email preference');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-red-600 dark:text-red-400" size={24} />
          <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Admin User Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage admin users and send invitations
            </p>
          </div>
        </div>
        
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <UserPlus size={18} />
            Add Admin
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-400">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Add Admin Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
              Add New Admin
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewAdminEmail('');
                setNewAdminName('');
                setError(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Admin's full name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={addAdmin}
                disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Add & Send Invitation
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewAdminEmail('');
                  setNewAdminName('');
                  setError(null);
                }}
                disabled={adding}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Loading admins...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Shield size={48} className="mx-auto mb-2 opacity-50" />
          <p>No admin users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.email}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={16} className="text-red-600 dark:text-red-400" />
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {admin.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {admin.email}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                  <span>
                    Added: {new Date(admin.created_at).toLocaleDateString()}
                  </span>
                  {admin.last_sign_in_at && (
                    <span>
                      Last sign in: {new Date(admin.last_sign_in_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {deletingEmail === admin.email ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remove admin access?</span>
                  <button
                    onClick={() => deleteAdmin(admin.email)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeletingEmail(null)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Receive Admin Emails Toggle */}
                  <button
                    onClick={() => toggleReceiveEmails(admin.email, admin.receive_admin_emails)}
                    className={`p-2 rounded-lg transition-colors ${
                      admin.receive_admin_emails
                        ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                        : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={admin.receive_admin_emails ? 'Receiving admin emails' : 'Not receiving admin emails'}
                  >
                    {admin.receive_admin_emails ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </button>
                  
                  {/* Delete Admin Button */}
                  <button
                    onClick={() => setDeletingEmail(admin.email)}
                    disabled={admins.length === 1}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={admins.length === 1 ? "Cannot delete the last admin" : "Remove admin access"}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary and Notes */}
      {admins.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{admins.filter(a => a.receive_admin_emails).length}</strong> of <strong>{admins.length}</strong> admin{admins.length !== 1 ? 's' : ''} receiving email notifications
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Admin users can sign in using magic links sent to their email. 
          When you add a new admin, they'll receive an invitation email with instructions. 
          Click the green checkmark to enable/disable admin email notifications.
        </p>
      </div>
    </div>
  );
};
