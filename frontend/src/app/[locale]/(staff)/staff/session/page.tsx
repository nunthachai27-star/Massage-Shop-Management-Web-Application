"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bookings } from "@/data/bookings";
import { services } from "@/data/services";
import { therapists } from "@/data/therapists";
import { beds } from "@/data/beds";
import { useState, useEffect } from "react";

function SessionCard({
  booking,
  now,
  t,
}: {
  booking: (typeof bookings)[0];
  now: Date;
  t: (key: string) => string;
}) {
  const service = services.find((s) => s.id === booking.serviceId);
  const therapist = therapists.find((th) => th.id === booking.therapistId);
  const bed = beds.find((b) => b.id === booking.bedId);

  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = Math.max(0, now.getTime() - startTime.getTime());
  const remaining = Math.max(0, endTime.getTime() - now.getTime());
  const progress = Math.min(100, (elapsed / totalDuration) * 100);

  const elapsedMinutes = Math.floor(elapsed / 60000);
  const remainingMinutes = Math.ceil(remaining / 60000);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {bed && <h3 className="font-heading text-lg text-white">{bed.name}</h3>}
          <Badge variant="gold">{t("staff.session")}</Badge>
        </div>
      </div>

      <div className="space-y-3 text-sm">
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
          <span className="text-white/50">Start Time</span>
          <span className="text-white">
            {startTime.toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Elapsed</span>
          <span className="text-accent-gold">{elapsedMinutes} min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Remaining</span>
          <span className="text-white">{remainingMinutes} min</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-gold-dark to-accent-gold transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/40 text-xs mt-1 text-right">{Math.round(progress)}%</p>
        </div>
      </div>

      <div className="mt-4">
        <Button size="sm" variant="primary" className="w-full">
          {t("staff.endService")}
        </Button>
      </div>
    </Card>
  );
}

export default function StaffSessionPage() {
  const t = useTranslations();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = bookings.filter((b) => b.status === "in_service");

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">{t("staff.session")}</h1>

      {activeSessions.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-white/40 text-lg">No active sessions</p>
            <p className="text-white/20 text-sm mt-2">Active sessions will appear here when a service is started.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeSessions.map((booking) => (
            <SessionCard key={booking.id} booking={booking} now={now} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
