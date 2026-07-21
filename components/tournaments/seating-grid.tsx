import { cn } from "@/lib/utils";
import type { SeatAssignment } from "@/lib/db/seat-assignments";

function TableOval({
  tableNumber,
  seatsPerTable,
  occupiedSeats,
  size = "full",
}: {
  tableNumber: number;
  seatsPerTable: number;
  occupiedSeats: Set<number>;
  size?: "full" | "compact";
}) {
  const dims = size === "full" ? "h-32 w-full" : "h-14 w-14";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", dims)}>
        <div
          className="absolute inset-[18%] rounded-full"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 35%, rgba(26,58,42,0.55), rgba(10,9,8,0.9))",
            border: "1px solid var(--accent)",
            opacity: 0.35,
          }}
        />
        {Array.from({ length: seatsPerTable }).map((_, i) => {
          const angle = (2 * Math.PI * i) / seatsPerTable - Math.PI / 2;
          const radius = 46;
          const left = 50 + radius * Math.cos(angle);
          const top = 50 + radius * Math.sin(angle);
          const seatNumber = i + 1;
          const isOccupied = occupiedSeats.has(seatNumber);
          const seatSize = size === "full" ? "h-4 w-4" : "h-2 w-2";

          return (
            <span
              key={seatNumber}
              title={
                size === "full"
                  ? `Стол ${tableNumber}, место ${seatNumber} — ${isOccupied ? "занято" : "свободно"}`
                  : undefined
              }
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors",
                seatSize,
                isOccupied
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]",
              )}
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          );
        })}
      </div>
      {size === "full" && (
        <span className="text-xs text-[var(--muted-foreground)]">Стол {tableNumber}</span>
      )}
    </div>
  );
}

export function SeatingGrid({
  tableCount,
  seatsPerTable,
  occupied,
  size = "full",
  className,
}: {
  tableCount: number;
  seatsPerTable: number;
  occupied: SeatAssignment[];
  size?: "full" | "compact";
  className?: string;
}) {
  const byTable = new Map<number, Set<number>>();
  for (const seat of occupied) {
    if (!byTable.has(seat.tableNumber)) byTable.set(seat.tableNumber, new Set());
    byTable.get(seat.tableNumber)!.add(seat.seatNumber);
  }

  return (
    <div
      className={cn(
        "grid gap-x-3 gap-y-5",
        size === "full" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: tableCount }).map((_, i) => (
        <TableOval
          key={i}
          tableNumber={i + 1}
          seatsPerTable={seatsPerTable}
          occupiedSeats={byTable.get(i + 1) ?? new Set()}
          size={size}
        />
      ))}
    </div>
  );
}
