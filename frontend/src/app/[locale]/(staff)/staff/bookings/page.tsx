import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bookings } from "@/data/bookings";
import { services } from "@/data/services";
import { therapists } from "@/data/therapists";
import { beds } from "@/data/beds";

const statusConfig = {
  booked: { label: { th: "จองแล้ว", en: "Booked" }, variant: "blue" as const },
  checked_in: { label: { th: "เช็คอินแล้ว", en: "Checked In" }, variant: "gold" as const },
  in_service: { label: { th: "กำลังให้บริการ", en: "In Service" }, variant: "green" as const },
  completed: { label: { th: "เสร็จแล้ว", en: "Completed" }, variant: "gray" as const },
  checkout: { label: { th: "เช็คเอาท์แล้ว", en: "Checked Out" }, variant: "gray" as const },
};

function getActionButton(status: string, t: (key: string) => string) {
  switch (status) {
    case "booked":
      return <Button size="sm" variant="outline">{t("staff.checkin")}</Button>;
    case "checked_in":
      return <Button size="sm" variant="primary">{t("staff.startService")}</Button>;
    case "in_service":
      return <Button size="sm" variant="primary">{t("staff.endService")}</Button>;
    case "completed":
      return <Button size="sm" variant="secondary">{t("staff.checkout")}</Button>;
    default:
      return null;
  }
}

export default async function StaffBookingsPage() {
  const t = await getTranslations();

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">{t("staff.bookings")}</h1>
      <div className="space-y-4">
        {bookings.map((booking) => {
          const config = statusConfig[booking.status];
          const service = services.find((s) => s.id === booking.serviceId);
          const therapist = therapists.find((th) => th.id === booking.therapistId);
          const bed = beds.find((b) => b.id === booking.bedId);

          return (
            <Card key={booking.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-lg text-white">{booking.customerName}</h3>
                    <Badge variant={config.variant}>{config.label.th}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {service && (
                      <div>
                        <span className="text-white/50">Service: </span>
                        <span className="text-white">{service.name.th}</span>
                      </div>
                    )}
                    {therapist && (
                      <div>
                        <span className="text-white/50">Therapist: </span>
                        <span className="text-white">{therapist.name.th}</span>
                      </div>
                    )}
                    {bed && (
                      <div>
                        <span className="text-white/50">Bed: </span>
                        <span className="text-white">{bed.name}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-white/50">Time: </span>
                      <span className="text-white">
                        {new Date(booking.startTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(booking.endTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getActionButton(booking.status, t)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
