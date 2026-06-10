import { useState } from 'react';
import { theme } from '../theme/tokens';
import { inputStyle, labelStyle, secondaryButtonStyle } from './ui';

/**
 * Kopyalanabilir salt-okunur alan — davet token'ı gibi yalnızca bir kez gösterilen
 * değerler için. Pano erişimi yoksa kullanıcı metni elle seçebilir.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(): void {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Pano erişimi engellenmişse alan zaten seçilebilir durumda.
      });
  }

  return (
    <label style={labelStyle}>
      {label}
      <div style={{ display: 'flex', gap: theme.spacing.sm }}>
        <input
          style={{ ...inputStyle, flexGrow: 1, fontFamily: 'monospace' }}
          type="text"
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
        />
        <button type="button" style={secondaryButtonStyle} onClick={handleCopy}>
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </label>
  );
}
