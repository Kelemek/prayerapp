import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { EmailTemplate } from '../../lib/emailService';

// Create hoisted mocks for the dynamic import
const mockGetAllTemplates = vi.fn();
const mockUpdateTemplate = vi.fn();

// Mock the email service module with hoisted mocks
vi.mock('../../lib/emailService', () => ({
  getAllTemplates: mockGetAllTemplates,
  updateTemplate: mockUpdateTemplate
}));

const mockTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Welcome Email',
    template_key: 'welcome',
    subject: 'Welcome to Prayer App',
    html_body: '<h1>Welcome!</h1>',
    text_body: 'Welcome!',
    description: 'Sent to new users',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Password Reset',
    template_key: 'password-reset',
    subject: 'Reset Your Password',
    html_body: '<h1>Reset Password</h1>',
    text_body: 'Reset Password',
    description: 'Password reset instructions',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('EmailTemplatesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    it('displays loading state initially', async () => {
      mockGetAllTemplates.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      expect(screen.getByText('Loading templates...')).toBeDefined();
    });

    it('loads and displays templates successfully', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
        expect(screen.getByText('Password Reset')).toBeDefined();
      });
    });

    it('displays error when loading fails', async () => {
      mockGetAllTemplates.mockRejectedValue(new Error('Failed to fetch'));

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load templates/i)).toBeDefined();
      });
    });

    it('displays error when no templates found', async () => {
      mockGetAllTemplates.mockResolvedValue([]);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('No templates found. Please run the database migration.')).toBeDefined();
      });
    });
  });

  describe('Template Selection', () => {
    it('opens editor when template is clicked', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeDefined();
      });
    });

    it('closes editor when clicking the same template again', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      // Click to open
      fireEvent.click(screen.getByText('Welcome Email'));
      
      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeDefined();
      });

      // Click again to close
      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        expect(screen.queryByText('Edit Template')).toBeNull();
      });
    });

    it('switches editor when selecting different template', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      // Select first template
      fireEvent.click(screen.getByText('Welcome Email'));
      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeDefined();
      });

      // Select second template
      fireEvent.click(screen.getByText('Password Reset'));
      await waitFor(() => {
        expect(screen.getByText('Edit Template')).toBeDefined();
      });
    });
  });

  describe('Template Editing', () => {
    it('allows editing template subject', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const subjectInput = screen.getByDisplayValue('Welcome to Prayer App') as HTMLInputElement;
        expect(subjectInput).toBeDefined();
        
        fireEvent.change(subjectInput, { target: { value: 'New Subject' } });
        expect(subjectInput.value).toBe('New Subject');
      });
    });

    it('allows editing template HTML body', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const htmlInput = screen.getByDisplayValue('<h1>Welcome!</h1>') as HTMLTextAreaElement;
        expect(htmlInput).toBeDefined();
        
        fireEvent.change(htmlInput, { target: { value: '<p>New HTML</p>' } });
        expect(htmlInput.value).toBe('<p>New HTML</p>');
      });
    });

    it('allows editing template text body', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const textInput = screen.getByDisplayValue('Welcome!') as HTMLTextAreaElement;
        expect(textInput).toBeDefined();
        
        fireEvent.change(textInput, { target: { value: 'New text' } });
        expect(textInput.value).toBe('New text');
      });
    });
  });

  describe('Save Template', () => {
    it('saves template successfully', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);
      
      const updatedTemplate = { ...mockTemplates[0], subject: 'Updated Subject' };
      mockUpdateTemplate.mockResolvedValue(updatedTemplate);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const subjectInput = screen.getByDisplayValue('Welcome to Prayer App') as HTMLInputElement;
        fireEvent.change(subjectInput, { target: { value: 'Updated Subject' } });
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateTemplate).toHaveBeenCalledWith('1', expect.objectContaining({
          subject: 'Updated Subject'
        }));
        expect(screen.getByText('Template saved successfully!')).toBeDefined();
      });
    });

    it('displays error when save fails', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);
      mockUpdateTemplate.mockRejectedValue(new Error('Save failed'));

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Failed to save template').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Revert Changes', () => {
    it('reverts template to original values', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const subjectInput = screen.getByDisplayValue('Welcome to Prayer App') as HTMLInputElement;
        fireEvent.change(subjectInput, { target: { value: 'Changed Subject' } });
        expect(subjectInput.value).toBe('Changed Subject');
      });

      const revertButton = screen.getByRole('button', { name: /revert/i });
      fireEvent.click(revertButton);

      await waitFor(() => {
        const subjectInput = screen.getByDisplayValue('Welcome to Prayer App') as HTMLInputElement;
        expect(subjectInput.value).toBe('Welcome to Prayer App');
      });
    });
  });

  describe('Preview Toggle', () => {
    it('toggles between edit and preview mode', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeDefined();
      });

      // Click preview button
      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeDefined();
      });
    });
  });

  describe('Refresh Templates', () => {
    it('reloads templates when refresh button is clicked', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      expect(mockGetAllTemplates).toHaveBeenCalledTimes(1);

      const refreshButton = screen.getByTitle('Refresh templates');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Template Display', () => {
    it('displays template key for each template', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('welcome')).toBeDefined();
        expect(screen.getByText('password-reset')).toBeDefined();
      });
    });

    it('applies selected styling to active template', async () => {
      mockGetAllTemplates.mockResolvedValue(mockTemplates);

      const { EmailTemplatesManager } = await import('../EmailTemplatesManager');
      render(<EmailTemplatesManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeDefined();
      });

      const templateButton = screen.getByText('Welcome Email').closest('button');
      expect(templateButton?.className).not.toContain('bg-blue-50');

      fireEvent.click(screen.getByText('Welcome Email'));

      await waitFor(() => {
        const activeButton = screen.getByText('Welcome Email').closest('button');
        expect(activeButton?.className).toContain('bg-blue-50');
      });
    });
  });
});
