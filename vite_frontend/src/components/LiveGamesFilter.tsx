import { useState } from "react";

export function LiveGamesFilter({ sports, onSportChange, onLeagueChange, selectedSport, selectedLeague }) {
  return (
    <div className="flex gap-4 mb-4">
      <select
        value={selectedSport}
        onChange={e => {
          onSportChange(e.target.value);
          onLeagueChange("");
        }}
        className="px-2 py-1 rounded border border-border bg-muted/20 text-sm"
      >
        <option value="">All Sports</option>
        {sports.map((sport) => (
          <option key={sport.id} value={sport.id}>{sport.name}</option>
        ))}
      </select>
      <select
        value={selectedLeague}
        onChange={e => onLeagueChange(e.target.value)}
        className="px-2 py-1 rounded border border-border bg-muted/20 text-sm"
        disabled={!selectedSport}
      >
        <option value="">All Leagues</option>
        {selectedSport && sports.find((s) => s.id === selectedSport)?.leagues.map((league) => (
          <option key={league.id} value={league.id}>{league.name}</option>
        ))}
      </select>
    </div>
  );
}
