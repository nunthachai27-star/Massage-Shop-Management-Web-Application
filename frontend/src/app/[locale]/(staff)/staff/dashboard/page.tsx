import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { beds } from "@/data/beds";
import { bookings } from "@/data/bookings";
import { services } from "@/data/services";
import { therapists } from "@/data/therapists";

const statusConfig = {
  available: { label: { th: "ว่าง", en: "Available" }, variant: "green" as const },
  reserved: { label: { th: "จองแล้ว", en: "Reserved" }, variant: "blue" as const },
  in_service: { label: { th: "กำลังใช้งาน", en: "In Service" }, variant: "gold" as const },
  cleaning: { label: { th: "ทำความสะอาด", en: "Cleaning" }, variant: "gray" as const },
};

export default async function StaffDashboardPage() {
  const t = await getTranslations();

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">{t("staff.beds")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {beds.map((bed) => {
          const config = statusConfig[bed.status];
          const booking = bed.currentBookingId
            ? bookings.find((b) => b.id === bed.currentBookingId)
            : null;
          const service = booking
            ? services.find((s) => s.id === booking.serviceId)
            : null;
          const therapist = booking
            ? therapists.find((th) => th.id === booking.therapistId)
            : null;

          return (
            <Card key={bed.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-white">{bed.name}</h3>
                <Badge variant={config.variant}>{config.label.th}</Badge>
              </div>
              {booking && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Customer</span>
                    <span className="text-white">{booking.customerName}</span>
                  </div>
                  {service && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Service</span>
                      <span className="text-white">{service.name.th}</span>
                    </div>
                  )}
                  {therapist && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Therapist</span>
                      <span className="text-white">{therapist.name.th}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/50">Time</span>
                    <span className="text-white">
                      {new Date(booking.startTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(booking.endTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              )}
              {!booking && bed.status === "available" && (
                <p className="text-white/30 text-sm">---</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
