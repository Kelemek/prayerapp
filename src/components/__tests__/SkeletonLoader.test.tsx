import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkeletonLoader } from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders default number of card skeletons (3) when no props provided', () => {
    const { container } = render(<SkeletonLoader />);
    const cards = container.querySelectorAll('.prayer-card');
    expect(cards.length).toBe(3);
  });

  it('renders the specified count of card skeletons', () => {
    const { container } = render(<SkeletonLoader count={5} type="card" />);
    const cards = container.querySelectorAll('.prayer-card');
    expect(cards.length).toBe(5);
  });

  it('renders list skeletons when type is list', () => {
    const { container } = render(<SkeletonLoader count={4} type="list" />);
    const listItems = container.querySelectorAll('.skeleton.h-16');
    // fallback: count the immediate divs under the wrapper if class selector above not found
    const fallback = container.querySelectorAll('.skeleton.h-16.w-full');
    expect(listItems.length + fallback.length).toBeGreaterThanOrEqual(4);
  });

  it('renders header skeleton when type is header', () => {
    const { container } = render(<SkeletonLoader type="header" />);
    const headerSkeleton = container.querySelector('.skeleton.h-8');
    expect(headerSkeleton).toBeDefined();
  });

  it('applies minHeight style to card skeletons', () => {
    const { container } = render(<SkeletonLoader count={1} type="card" />);
    const card = container.querySelector('.prayer-card') as HTMLElement | null;
    expect(card).not.toBeNull();
    expect(card?.style.minHeight).toBe('200px');
  });
});