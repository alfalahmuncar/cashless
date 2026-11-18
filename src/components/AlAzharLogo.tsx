import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface InstitutionLogoProps {
  size?: number;
  logoUrl?: string;
  institutionName?: string;
  className?: string;
}

function getInitials(name: string): string {
  const words = String(name || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  size = 56,
  logoUrl = '',
  institutionName = 'Lembaga',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-1 shadow-xs ${className}`}
      >
        <img
          src={logoUrl}
          alt={`Logo ${institutionName}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const initials = getInitials(institutionName);
  const fontSize = Math.max(12, Math.round(size * 0.34));

  return (
    <div
      style={{ width: size, height: size }}
      aria-label={`Logo ${institutionName}`}
      className={`shrink-0 rounded-xl bg-slate-100 border border-dashed border-slate-300 text-[#0b3b8c] flex items-center justify-center font-extrabold tracking-tight select-none ${className}`}
    >
      {initials ? (
        <span style={{ fontSize }} className="leading-none">
          {initials}
        </span>
      ) : (
        <Building2 style={{ width: size * 0.45, height: size * 0.45 }} />
      )}
    </div>
  );
};

export const AlAzharLogo = InstitutionLogo;
