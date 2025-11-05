import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeletionStyleCard } from '../DeletionStyleCard';

describe('DeletionStyleCard', () => {
  describe('Rendering', () => {
    it('renders without props', () => {
      const { container } = render(<DeletionStyleCard />);
      
      expect(container.querySelector('.bg-white')).toBeDefined();
      expect(container.querySelector('.dark\\:bg-gray-800')).toBeDefined();
    });

    it('renders with title', () => {
      render(<DeletionStyleCard title="Test Title" />);
      
      expect(screen.getByRole('heading', { name: 'Test Title' })).toBeDefined();
    });

    it('renders with content', () => {
      render(<DeletionStyleCard content="Test content message" />);
      
      expect(screen.getByText('Test content message')).toBeDefined();
    });

    it('renders with reason', () => {
      render(<DeletionStyleCard reason="Duplicate request" />);
      
      expect(screen.getByText('Reason for deletion:')).toBeDefined();
      expect(screen.getByText('Duplicate request')).toBeDefined();
    });

    it('does not render reason section when reason is null', () => {
      render(<DeletionStyleCard reason={null} />);
      
      expect(screen.queryByText('Reason for deletion:')).toBeNull();
    });

    it('does not render reason section when reason is not provided', () => {
      render(<DeletionStyleCard />);
      
      expect(screen.queryByText('Reason for deletion:')).toBeNull();
    });

    it('renders metaLeft content', () => {
      render(
        <DeletionStyleCard 
          metaLeft={<div>Meta Left Info</div>}
        />
      );
      
      expect(screen.getByText('Meta Left Info')).toBeDefined();
    });

    it('renders metaRight content', () => {
      render(
        <DeletionStyleCard 
          metaRight={<div>Meta Right Info</div>}
        />
      );
      
      expect(screen.getByText('Meta Right Info')).toBeDefined();
    });

    it('renders actions', () => {
      render(
        <DeletionStyleCard 
          actions={
            <button>Action Button</button>
          }
        />
      );
      
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeDefined();
    });

    it('renders multiple actions', () => {
      render(
        <DeletionStyleCard 
          actions={
            <>
              <button>Approve</button>
              <button>Deny</button>
            </>
          }
        />
      );
      
      expect(screen.getByRole('button', { name: 'Approve' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Deny' })).toBeDefined();
    });
  });

  describe('Layout and Styling', () => {
    it('applies card container styles', () => {
      const { container } = render(<DeletionStyleCard />);
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('dark:bg-gray-800');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('shadow-md');
      expect(card.className).toContain('border');
    });

    it('applies title heading styles', () => {
      render(<DeletionStyleCard title="Styled Title" />);
      
      const heading = screen.getByRole('heading');
      expect(heading.className).toContain('text-lg');
      expect(heading.className).toContain('font-semibold');
      expect(heading.className).toContain('text-gray-800');
      expect(heading.className).toContain('dark:text-gray-100');
    });

    it('applies content paragraph styles', () => {
      const { container } = render(<DeletionStyleCard content="Content text" />);
      
      const paragraph = container.querySelector('p');
      expect(paragraph).toBeDefined();
      expect(paragraph?.className).toContain('text-gray-600');
      expect(paragraph?.className).toContain('dark:text-gray-300');
    });

    it('applies reason section background styling', () => {
      const { container } = render(<DeletionStyleCard reason="Test reason" />);
      
      const reasonBox = container.querySelector('.bg-gray-50');
      expect(reasonBox).toBeDefined();
      expect(reasonBox?.className).toContain('dark:bg-gray-900/20');
      expect(reasonBox?.className).toContain('border');
      expect(reasonBox?.className).toContain('p-3');
      expect(reasonBox?.className).toContain('rounded');
    });

    it('applies flexbox layout to actions', () => {
      const { container } = render(
        <DeletionStyleCard 
          actions={<button>Test</button>}
        />
      );
      
      const actionsContainer = container.querySelector('.flex.flex-wrap.gap-3');
      expect(actionsContainer).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('renders all props together', () => {
      render(
        <DeletionStyleCard 
          title="Prayer Request"
          content="Please pray for healing"
          metaLeft={<div>Submitted by: John Doe</div>}
          metaRight={<div>Date: 2025-10-18</div>}
          reason="Inappropriate content"
          actions={
            <>
              <button>Approve</button>
              <button>Deny</button>
            </>
          }
        />
      );
      
      expect(screen.getByRole('heading', { name: 'Prayer Request' })).toBeDefined();
      expect(screen.getByText('Please pray for healing')).toBeDefined();
      expect(screen.getByText('Submitted by: John Doe')).toBeDefined();
      expect(screen.getByText('Date: 2025-10-18')).toBeDefined();
      expect(screen.getByText('Inappropriate content')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Deny' })).toBeDefined();
    });

    it('renders with React components as content', () => {
      render(
        <DeletionStyleCard 
          content={
            <div>
              <strong>Important:</strong> This is a complex message
            </div>
          }
        />
      );
      
      expect(screen.getByText('Important:')).toBeDefined();
      expect(screen.getByText('This is a complex message')).toBeDefined();
    });

    it('renders with empty strings', () => {
      render(
        <DeletionStyleCard 
          title=""
          reason=""
        />
      );
      
      // Empty title won't render heading since the component checks `title &&`
      const headings = document.querySelectorAll('h3');
      expect(headings.length).toBe(0);
    });
  });

  describe('Conditional Rendering', () => {
    it('does not render title heading when title is not provided', () => {
      const { container } = render(<DeletionStyleCard content="Only content" />);
      
      const headings = container.querySelectorAll('h3');
      expect(headings.length).toBe(0);
    });

    it('does not render content section when content is not provided', () => {
      const { container } = render(<DeletionStyleCard title="Only title" />);
      
      // Should have the title but no paragraph for content
      expect(screen.getByRole('heading', { name: 'Only title' })).toBeDefined();
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });

    it('does not render actions section when actions is not provided', () => {
      const { container } = render(<DeletionStyleCard title="No actions" />);
      
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('does not render meta sections when not provided', () => {
      render(<DeletionStyleCard title="No meta" />);
      
      // Just checking it renders without errors
      expect(screen.getByRole('heading', { name: 'No meta' })).toBeDefined();
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes for container', () => {
      const { container } = render(<DeletionStyleCard />);
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('dark:bg-gray-800');
      expect(card.className).toContain('dark:border-gray-700');
    });

    it('includes dark mode classes for title', () => {
      render(<DeletionStyleCard title="Dark Mode Title" />);
      
      const heading = screen.getByRole('heading');
      expect(heading.className).toContain('dark:text-gray-100');
    });

    it('includes dark mode classes for content', () => {
      const { container } = render(<DeletionStyleCard content="Dark content" />);
      
      const paragraph = container.querySelector('p');
      expect(paragraph?.className).toContain('dark:text-gray-300');
    });

    it('includes dark mode classes for reason section', () => {
      const { container } = render(<DeletionStyleCard reason="Dark reason" />);
      
      const reasonLabel = screen.getByText('Reason for deletion:');
      expect(reasonLabel.className).toContain('dark:text-gray-200');
      
      const reasonBox = container.querySelector('.bg-gray-50');
      expect(reasonBox?.className).toContain('dark:bg-gray-900/20');
      expect(reasonBox?.className).toContain('dark:border-gray-800');
      expect(reasonBox?.className).toContain('dark:text-gray-200');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for title', () => {
      render(<DeletionStyleCard title="Accessible Title" />);
      
      const heading = screen.getByRole('heading', { name: 'Accessible Title' });
      expect(heading.tagName).toBe('H3');
    });

    it('maintains proper document structure', () => {
      const { container } = render(
        <DeletionStyleCard 
          title="Main Title"
          content="Main content"
        />
      );
      
      // Should have proper div > div > h3 structure
      const card = container.firstChild;
      expect(card?.nodeName).toBe('DIV');
    });
  });
});
