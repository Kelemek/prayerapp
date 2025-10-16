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
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const currentTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
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
      // Split into two columns (column-major ordering)
      const mid = Math.ceil(statusPrayers.length / 2);
      const col1 = statusPrayers.slice(0, mid);
      const col2 = statusPrayers.slice(mid);

      const col1HTML = col1.map((prayer, idx) => generatePrayerHTML(prayer, idx + 1)).join('');
      const col2HTML = col2.map((prayer, idx) => generatePrayerHTML(prayer, mid + idx + 1)).join('');

      prayerSectionsHTML += `
        <div class="status-section">
          <h2 style="color: ${statusColors[status]}; border-bottom: 2px solid ${statusColors[status]}; padding-bottom: 3px; margin-bottom: 4px; margin-top: 8px; font-size: 16px;">
            ${statusLabels[status]} (${statusPrayers.length})
          </h2>
          <div class="columns">
            <div class="col">${col1HTML}</div>
            <div class="col">${col2HTML}</div>
          </div>
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
            line-height: 1.4;
            color: #222;
            background: white;
            padding: 12px;
            max-width: 1000px;
            margin: 0 auto;
            font-size: 13px;
          }

          .header {
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .header-right {
            font-size: 12px;
            color: #6b7280;
            white-space: nowrap;
          }

          .header h1 {
            font-size: 18px;
            color: #1f2937;
            margin: 0;
          }

          .header .subtitle {
            font-size: 14px;
            color: #6b7280;
            font-style: italic;
          }

          .date-range {
            font-size: 13px;
            color: #4b5563;
          }

          .status-section {
            margin-bottom: 6px;
          }

          .prayer-item {
            /* keep card look but reduce ink and spacing */
            background: transparent;
            border: 1px solid #e6e6e6;
            padding: 6px 8px;
            margin-bottom: 6px;
            border-radius: 2px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .prayer-item.current {
            border-left: 3px solid #3b82f6;
          }

          .prayer-item.ongoing {
            border-left: 3px solid #f59e0b;
          }

          .prayer-item.answered {
            border-left: 3px solid #10b981;
          }

          .prayer-item.closed {
            border-left: 3px solid #6b7280;
          }

          .prayer-number {
            display: inline-block;
            background: #3b82f6;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            text-align: center;
            line-height: 20px;
            font-weight: 700;
            font-size: 11px;
            margin-right: 6px;
          }

          .prayer-title {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
            display: inline;
          }

          .prayer-for {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 5px;
            font-weight: 600;
          }

          .prayer-meta {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 5px;
            font-style: italic;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            align-items: center;
          }

          .prayer-description {
            font-size: 14px;
            color: #374151;
            line-height: 1.5;
            margin-bottom: 5px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          /* Condensed updates section */
          .updates-section {
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px dotted #d1d5db;
          }

          .updates-header {
            font-size: 12px;
            font-weight: 700;
            color: #6b7280;
            margin-bottom: 3px;
          }

          .update-item {
            font-size: 12px;
            color: #374151;
            line-height: 1.4;
            margin-bottom: 2px;
          }

          .update-meta {
            font-weight: 600;
            color: #6b7280;
          }
          .columns {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }

          .col {
            flex: 1 1 0;
            min-width: 0;
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
          <div class="header-left">
            <h1>🙏 Church Prayer List</h1>
            <span class="date-range">${dateRange}</span>
          </div>
          <div class="header-right">
            Generated: ${today} at ${currentTime}
          </div>
        </div>
        ${prayerSectionsHTML}
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
  
  // Show updates in condensed format with minimal spacing
  const updatesHTML = updates.length > 0 ? `
    <div class="updates-section">
      <div class="updates-header">Updates (${updates.length}):</div>
      ${updates.map(update => {
        const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        return `<div class="update-item"><span class="update-meta">${update.author || 'Anonymous'} • ${updateDate}:</span> ${update.content}</div>`;
      }).join('')}
    </div>
  ` : '';

  // Place requester and date on a single line; right-side show answered date if present
  const requesterText = `Requested by ${prayer.requester || 'Anonymous'}`;
  const rightMeta = answeredDate ? `Answered on ${answeredDate}` : '';

  return `
    <div class="prayer-item ${prayer.status}">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div class="prayer-for"><strong>Prayer For:</strong> ${prayer.prayer_for}</div>
      </div>
      <div class="prayer-meta">
        <span>${requesterText} • ${createdDate}</span>
        <span>${rightMeta}</span>
      </div>
      <div class="prayer-description">${prayer.description}</div>
      ${updatesHTML}
    </div>
  `;
}
