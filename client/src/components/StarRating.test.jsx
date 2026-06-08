import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('renders exactly 5 star buttons', () => {
    render(<StarRating value={0} onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('calls onChange with the clicked star number', () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Rate 3 stars'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with 1 when first star clicked', () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Rate 1 star'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with 5 when last star clicked', () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Rate 5 stars'));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
