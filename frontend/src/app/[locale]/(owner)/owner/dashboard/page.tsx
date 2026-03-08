import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { bookings as mockBookings, type Booking } from "@/data/bookings";
import { api } from "@/lib/api";
import { transformBooking } from "@/lib/transform";

export default async function OwnerDashboardPage() {
  const t = await getTranslations();

  // Fetch real metrics from API
  let totalCustomers = 0;
  let dailyRevenue = 0;
  let bedUtilization = 0;
  try {
    const metrics = await api.getDailyMetrics();
    totalCustomers = (metrics.totalCustomers as number) || 0;
    dailyRevenue = (metrics.dailyRevenue as number) || 0;
    bedUtilization = (metrics.bedUtilization as number) || 0;
  } catch {
    // API unavailable — show zeros
  }

  const metricCards = [
    { labelKey: "owner.totalCustomers", value: String(totalCustomers), icon: "👥" },
    { labelKey: "owner.dailyRevenue", value: dailyRevenue.toLocaleString(), suffix: " ฿", icon: "💰" },
    { labelKey: "owner.bedUtilization", value: String(bedUtilization), suffix: "%", icon: "🚪" },
  ];

  let bookings: Booking[];
  try {
    const raw = await api.getBookings();
    bookings = raw.map(transformBooking);
  } catch {
    bookings = mockBookings;
  }

  const statusCounts = bookings.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">{t("owner.dashboard")}</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {metricCards.map((metric) => (
          <Card key={metric.labelKey}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{metric.icon}</span>
              <div>
                <p className="text-accent-gold text-3xl font-bold">
                  {metric.value}
                  {metric.suffix || ""}
                </p>
                <p className="text-white/50 text-sm">{t(metric.labelKey)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Booking Status Summary */}
      <Card>
        <h2 className="font-heading text-lg text-white mb-4">{t("staff.bookings")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center p-3 bg-surface-dark rounded-lg">
              <p className="text-white text-2xl font-bold">{count}</p>
              <Badge
                variant={
                  status === "booked"
                    ? "blue"
                    : status === "in_service"
                      ? "gold"
                      : status === "completed"
                        ? "green"
                        : "gray"
                }
              >
                {status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
