/** Form alanı yardımcıları — ortak input/etiket/düğme stilleri (tema token'larından). */

import type { CSSProperties, ReactNode } from 'react';
import { colors, radii } from '../../theme/tokens';

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: radii.md,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  color: colors.textPrimary,
  backgroundColor: colors.surface,
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'auto',
};

export const primaryButtonStyle: CSSProperties = {
  padding: '9px 16px',
  borderRadius: radii.md,
  border: 'none',
  backgroundColor: colors.primary,
  color: colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 600,
};

export const secondaryButtonStyle: CSSProperties = {
  padding: '9px 16px',
  borderRadius: radii.md,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontSize: 14,
};

export const dangerLinkButtonStyle: CSSProperties = {
  border: 'none',
  backgroundColor: 'transparent',
  color: colors.danger,
  fontSize: 13,
  padding: '4px 6px',
};

export const linkButtonStyle: CSSProperties = {
  border: 'none',
  backgroundColor: 'transparent',
  color: colors.primary,
  fontSize: 13,
  padding: '4px 6px',
};

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, htmlFor, required = false, children, hint }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 13,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        {label}
        {required && <span style={{ color: colors.danger }}> *</span>}
      </label>
      {children}
      {hint !== undefined && (
        <div style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{hint}</div>
      )}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function CheckboxField({ label, checked, onChange, disabled = false }: CheckboxFieldProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        color: disabled ? colors.textSecondary : colors.textPrimary,
        marginBottom: 8,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
