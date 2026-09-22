import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormField } from '../components/ui/form';
import { Input } from '../components/ui/input';

describe('FormField', () => {
  it('should correctly associate label and input via htmlFor', () => {
    render(
      <FormField label="Email Address" htmlFor="email-input">
        <Input id="email-input" type="email" />
      </FormField>
    );
    const input = screen.getByLabelText('Email Address');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('should display error message when provided', () => {
    render(
      <FormField label="Username" htmlFor="user-input" error="Username is required">
        <Input id="user-input" type="text" />
      </FormField>
    );
    expect(screen.getByText('Username is required')).toBeInTheDocument();
  });
});
