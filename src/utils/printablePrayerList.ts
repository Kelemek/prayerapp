import { supabase } from '../lib/supabase';

export interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  date_answered?: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

export type TimeRange = 'week' | 'month' | 'year';

/**
 * Generate and download a printable prayer list for the specified time range
 */
export const downloadPrintablePrayerList = async (timeRange: TimeRange = 'month', newWindow: Window | null = null) => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Fetch prayers with their updates (LEFT JOIN to include prayers without updates)
    const { data: prayers, error } = await supabase
      .from('prayers')
      .select(`
        *,
        prayer_updates(*)
      `)
      .eq('approval_status', 'approved')
      .neq('status', 'closed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prayers:', error);
      alert('Failed to fetch prayers. Please try again.');
      if (newWindow) newWindow.close();
      return;
    }

    if (!prayers || prayers.length === 0) {
      const rangeText = timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'year';
      alert(`No prayers found in the last ${rangeText}.`);
      if (newWindow) newWindow.close();
      return;
    }

    const html = generatePrintableHTML(prayers, timeRange);

    // Use the pre-opened window if provided (Safari compatible)
    const targetWindow = newWindow || window.open('', '_blank');
    
    if (!targetWindow) {
      // Fallback: if popup blocked, offer download
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const today = new Date().toISOString().split('T')[0];
      const rangeLabel = timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'year';
      link.download = `prayer-list-${rangeLabel}-${today}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      alert('Prayer list downloaded. Please open the file to view and print.');
    } else {
      // Write the HTML content to the window
      targetWindow.document.open();
      targetWindow.document.write(html);
      targetWindow.document.close();
      // Switch focus to the new tab
      targetWindow.focus();
    }
  } catch (error) {
    console.error('Error generating prayer list:', error);
    alert('Failed to generate prayer list. Please try again.');
  }
}

/**
 * Generate printable HTML for prayer list
 */
function generatePrintableHTML(prayers: any[], timeRange: TimeRange = 'month'): string {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate start date based on time range
  const startDate = new Date();
  let rangeLabel = '';
  
  switch (timeRange) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      rangeLabel = 'Last Week';
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      rangeLabel = 'Last Month';
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      rangeLabel = 'Last Year';
      break;
  }
  
  const dateRange = `${startDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })} - ${today}`;

  // Group prayers by status (exclude closed prayers)
  const prayersByStatus = {
    current: prayers.filter(p => p.status === 'current'),
    ongoing: prayers.filter(p => p.status === 'ongoing'),
    answered: prayers.filter(p => p.status === 'answered')
  };

  const statusLabels = {
    current: 'Current Prayer Requests',
    ongoing: 'Ongoing Prayer Requests',
    answered: 'Answered Prayers'
  };

  const statusColors = {
    current: '#3b82f6',
    ongoing: '#f59e0b',
    answered: '#10b981'
  };

  let prayerSectionsHTML = '';

  // Generate sections for each status (excluding closed)
  (['current', 'ongoing', 'answered'] as const).forEach(status => {
    const statusPrayers = prayersByStatus[status];
    if (statusPrayers.length > 0) {
      prayerSectionsHTML += `
        <div class="status-section">
          <h2 style="color: ${statusColors[status]}; border-bottom: 2px solid ${statusColors[status]}; padding-bottom: 6px; margin-bottom: 12px; font-size: 20px;">
            ${statusLabels[status]} (${statusPrayers.length})
          </h2>
          ${statusPrayers.map((prayer, index) => generatePrayerHTML(prayer, index + 1)).join('')}
        </div>
      `;
    }
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer List - ${today}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.4;
            color: #333;
            background: white;
            padding: 25px;
            max-width: 900px;
            margin: 0 auto;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
          }

          .header h1 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 5px;
          }

          .header .subtitle {
            font-size: 14px;
            color: #6b7280;
            font-style: italic;
          }

          .date-range {
            font-size: 13px;
            color: #4b5563;
            margin-top: 5px;
          }

          .status-section {
            margin-bottom: 30px;
          }

          .prayer-item {
            background: #f9fafb;
            border-left: 4px solid #3b82f6;
            padding: 12px 15px;
            margin-bottom: 15px;
            border-radius: 3px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .prayer-item.ongoing {
            border-left-color: #f59e0b;
          }

          .prayer-item.answered {
            border-left-color: #10b981;
          }

          .prayer-item.closed {
            border-left-color: #6b7280;
          }

          .prayer-number {
            display: inline-block;
            background: #3b82f6;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 8px;
          }

          .prayer-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
            display: inline;
          }

          .prayer-for {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 8px;
          }

          .prayer-meta {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 10px;
            font-style: italic;
          }

          .prayer-description {
            font-size: 14px;
            color: #374151;
            line-height: 1.5;
            margin-bottom: 10px;
            white-space: pre-wrap;
          }

          .updates-section {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px dotted #d1d5db;
          }

          .updates-title {
            font-size: 13px;
            font-weight: bold;
            color: #4b5563;
            margin-bottom: 8px;
          }

          .update-item {
            background: white;
            padding: 8px 10px;
            margin-bottom: 8px;
            border-radius: 3px;
            border: 1px solid #e5e7eb;
          }

          .update-meta {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 4px;
          }

          .update-content {
            font-size: 13px;
            color: #374151;
            line-height: 1.4;
            white-space: pre-wrap;
          }

          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }

          @media screen and (max-width: 768px) {
            body {
              padding: 15px;
              font-size: 16px;
            }

            .header h1 {
              font-size: 24px;
            }

            .prayer-title {
              font-size: 16px;
            }

            .prayer-number {
              width: 20px;
              height: 20px;
              line-height: 20px;
              font-size: 11px;
            }
          }

          @media print {
            body {
              padding: 15px;
            }

            .no-print {
              display: none !important;
            }

            .prayer-item {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            h2 {
              page-break-after: avoid;
              break-after: avoid;
            }
          }

          @page {
            margin: 0.5in;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🙏 Church Prayer List</h1>
          <p class="date-range">${dateRange}</p>
        </div>
        ${prayerSectionsHTML}
        <div class="footer">
          <p>Generated on ${today}</p>
          <p style="margin-top: 10px;">May God bless all those who are lifted up in prayer.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for a single prayer
 */
function generatePrayerHTML(prayer: any, number: number): string {
  const createdDate = new Date(prayer.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const answeredDate = prayer.date_answered 
    ? new Date(prayer.date_answered).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // Sort updates by date (newest first)
  const updates = Array.isArray(prayer.prayer_updates) 
    ? [...prayer.prayer_updates].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  const updatesHTML = updates.length > 0 ? `
    <div class="updates-section">
      <div class="updates-title">📝 Updates (${updates.length})</div>
      ${updates.map(update => {
        const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        return `
          <div class="update-item">
            <div class="update-meta">
              <strong>${update.author || 'Anonymous'}</strong> • ${updateDate}
            </div>
            <div class="update-content">${update.content}</div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  return `
    <div class="prayer-item ${prayer.status}">
      <div class="prayer-for">
        <strong>Prayer For:</strong> ${prayer.prayer_for}
      </div>
      <div class="prayer-meta">
        Requested by ${prayer.requester || 'Anonymous'} on ${createdDate}
        ${answeredDate ? ` • Answered on ${answeredDate}` : ''}
      </div>
      <div class="prayer-description">${prayer.description}</div>
      ${updatesHTML}
    </div>
  `;
}
