export function MobileGameTableHeader() {
  return (
    <div className="grid grid-cols-4 gap-2 px-2.5 py-2 bg-muted/30 border-b border-border mb-2">
            <div className="text-[10px] font-semibold text-foreground uppercase">
        Teams
      </div>
            <div className="text-[10px] font-semibold text-foreground uppercase text-center">
        Spread
      </div>
            <div className="text-[10px] font-semibold text-foreground uppercase text-center">
        Total
      </div>
            <div className="text-[10px] font-semibold text-foreground uppercase text-center">
        Moneyline
      </div>
    </div>
  );
}
