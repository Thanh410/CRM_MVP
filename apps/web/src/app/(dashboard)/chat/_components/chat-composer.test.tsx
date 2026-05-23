import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatComposer } from './chat-composer';

describe('ChatComposer', () => {
  it('sends when the button is clicked', () => {
    const onSend = vi.fn();
    render(<ChatComposer value="Xin chào" onChange={vi.fn()} onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('sends on Enter and preserves newline on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<ChatComposer value="Xin chào" onChange={vi.fn()} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Nhập tin nhắn...');

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
