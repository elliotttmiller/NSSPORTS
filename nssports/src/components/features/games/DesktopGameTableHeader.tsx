export function DesktopGameTableHeader() {
  return (
    <div className="hidden lg:block">
      <div className="bg-card/50 border border-border/50 rounded-t-lg border-b-0">
        <div className="grid grid-cols-[60px_1fr_auto_auto_auto] xl:grid-cols-[80px_1fr_120px_120px_120px] gap-2 xl:gap-4 items-center py-3 px-2 xl:px-4 bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            League
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Teams
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Spread
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Total
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Moneyline
          </div>
        </div>
      </div>
    </div>
  );
}
