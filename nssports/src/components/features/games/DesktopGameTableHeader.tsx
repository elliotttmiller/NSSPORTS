export function DesktopGameTableHeader() {
  return (
    <div className="hidden lg:block">
      <div className="bg-card/50 border border-border/50 rounded-t-lg border-b-0">
        <div className="grid grid-cols-[minmax(60px,80px)_minmax(200px,1fr)_minmax(100px,140px)_minmax(100px,140px)_minmax(100px,140px)] gap-2 lg:gap-3 xl:gap-4 2xl:gap-6 items-center py-3 lg:py-3.5 px-2 lg:px-3 xl:px-4 2xl:px-6 bg-muted/30">
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
            League
          </div>
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Teams
          </div>
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide text-center">
            Spread
          </div>
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide text-center">
            Total
          </div>
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide text-center">
            Moneyline
          </div>
        </div>
      </div>
    </div>
  );
}
