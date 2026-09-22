import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogContent, DialogFooter } from '../components/ui/dialog';

describe('Dialog', () => {
  it('should trap focus looping Tab and Shift+Tab', () => {
    const handleClose = jest.fn();
    render(
      <Dialog open={true} onClose={handleClose}>
        <DialogContent>
          <input data-testid="input-1" />
          <button data-testid="button-1">Save</button>
        </DialogContent>
        <DialogFooter>
          <button data-testid="button-2">Cancel</button>
        </DialogFooter>
      </Dialog>
    );
    
    const input1 = screen.getByTestId('input-1');
    const button2 = screen.getByTestId('button-2');
    
    // Simulate focusing the last element
    button2.focus();
    expect(document.activeElement).toBe(button2);
    
    // Simulate Tab key on the last element to wrap to first
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    expect(document.activeElement).toBe(input1);
    
    // Simulate Shift+Tab on the first element to wrap to last
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(button2);
  });

  it('should close on Escape', () => {
    const handleClose = jest.fn();
    render(
      <Dialog open={true} onClose={handleClose}>
        <DialogContent><button>Focusable</button></DialogContent>
      </Dialog>
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
