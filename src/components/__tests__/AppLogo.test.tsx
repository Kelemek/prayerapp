import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLogo } from '../AppLogo';

describe('AppLogo', () => {
  it('renders null when no image URL is provided', () => {
    const { container } = render(<AppLogo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders light mode image when provided', () => {
    render(<AppLogo lightModeImageUrl="/light-logo.png" />);
    const img = screen.getByRole('img', { name: /church logo/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/light-logo.png');
  });

  it('renders dark mode image when isDarkMode is true', () => {
    render(
      <AppLogo 
        lightModeImageUrl="/light-logo.png" 
        darkModeImageUrl="/dark-logo.png" 
        isDarkMode={true}
      />
    );
    const img = screen.getByRole('img', { name: /church logo/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/dark-logo.png');
  });

  it('renders light mode image when isDarkMode is false', () => {
    render(
      <AppLogo 
        lightModeImageUrl="/light-logo.png" 
        darkModeImageUrl="/dark-logo.png" 
        isDarkMode={false}
      />
    );
    const img = screen.getByRole('img', { name: /church logo/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/light-logo.png');
  });

  it('defaults to light mode when isDarkMode is not provided', () => {
    render(
      <AppLogo 
        lightModeImageUrl="/light-logo.png" 
        darkModeImageUrl="/dark-logo.png"
      />
    );
    const img = screen.getByRole('img', { name: /church logo/i });
    expect(img).toHaveAttribute('src', '/light-logo.png');
  });

  it('renders null when only dark mode URL is provided but isDarkMode is false', () => {
    const { container } = render(
      <AppLogo 
        darkModeImageUrl="/dark-logo.png" 
        isDarkMode={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dark mode image when only dark mode URL is provided and isDarkMode is true', () => {
    render(
      <AppLogo 
        darkModeImageUrl="/dark-logo.png" 
        isDarkMode={true}
      />
    );
    const img = screen.getByRole('img', { name: /church logo/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/dark-logo.png');
  });

  it('applies correct CSS classes', () => {
    render(<AppLogo lightModeImageUrl="/logo.png" />);
    const img = screen.getByRole('img', { name: /church logo/i });
    expect(img).toHaveClass('h-16', 'w-auto', 'max-w-xs');
  });

  it('has correct alt text', () => {
    render(<AppLogo lightModeImageUrl="/logo.png" />);
    const img = screen.getByAltText('Church Logo');
    expect(img).toBeInTheDocument();
  });
});
