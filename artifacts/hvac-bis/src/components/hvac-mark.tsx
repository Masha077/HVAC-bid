export function HvacMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-hvac-bis">
      <svg aria-hidden="true" width={compact ? 30 : 38} height={compact ? 30 : 38} viewBox="0 0 38 38" fill="none">
        <rect x="1" y="1" width="36" height="36" rx="9" fill="#92140C" />
        <path d="M8 24.5h22M11 24.5v-9.2l8-5.4 8 5.4v9.2M15 24.5v-5.7h6v5.7M25.5 12.8c2.4.2 4.1 1.4 5.4 3.4" stroke="#FFF8F0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 9.3c2.6.6 4.6 2.1 5.9 4.5" stroke="#E8B9A5" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {!compact && <div><div className="font-brand text-[13px] tracking-[.08em]">HVAC BIS</div><div className="mt-1 text-[10px] text-muted-foreground">BID INTELLIGENCE SYSTEM</div></div>}
    </div>
  );
}