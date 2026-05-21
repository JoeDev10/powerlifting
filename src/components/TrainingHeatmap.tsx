"use client";

const WEEKS = 16;
const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default function TrainingHeatmap({ sessionDates }: { sessionDates: string[] }) {
  const dateSet = new Set(sessionDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Find this week's Monday
  const dow = today.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysFromMonday);

  // Start: 15 weeks before this Monday
  const start = new Date(thisMonday);
  start.setDate(thisMonday.getDate() - 15 * 7);

  // Build grid: 16 weeks × 7 days (Mon–Sun)
  const weeks: { date: string; isFuture: boolean }[][] = [];
  const cursor = new Date(start);

  for (let w = 0; w < WEEKS; w++) {
    const week: { date: string; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      week.push({ date: dateStr, isFuture: dateStr > todayStr });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels: show month name on first week of a new month
  const monthLabels = weeks.map((week) => {
    const d = new Date(week[0].date);
    const prev = new Date(d);
    prev.setDate(d.getDate() - 7);
    return d.getMonth() !== prev.getMonth()
      ? d.toLocaleDateString("es-AR", { month: "short" })
      : null;
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1.5 pt-5">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[13px] w-3 text-[9px] text-gray-600 leading-[13px]">
              {i % 2 === 0 ? label : ""}
            </div>
          ))}
        </div>

        <div>
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 h-4">
            {monthLabels.map((label, wi) => (
              <div key={wi} className="w-[13px] text-[9px] text-gray-500 overflow-visible whitespace-nowrap">
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={day.date}
                    className={`h-[13px] w-[13px] rounded-[3px] transition-colors ${
                      day.isFuture
                        ? "bg-transparent"
                        : dateSet.has(day.date)
                        ? "bg-orange-600 hover:bg-orange-500"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
