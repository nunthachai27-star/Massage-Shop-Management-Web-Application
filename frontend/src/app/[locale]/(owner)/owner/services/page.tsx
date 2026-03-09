"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

type ApiRecord = Record<string, unknown>;

interface ServiceData {
  id: number;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  duration: number;
  price: number;
  is_active: boolean;
}

function toService(r: ApiRecord): ServiceData {
  return {
    id: r.id as number,
    name_th: r.name_th as string,
    name_en: r.name_en as string,
    description_th: (r.description_th as string) || null,
    description_en: (r.description_en as string) || null,
    duration: Number(r.duration),
    price: Number(r.price),
    is_active: r.is_active !== false,
  };
}

export default function ManageServicesPage() {
  const t = useTranslations("owner");
  const locale = useLocale();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formNameTh, setFormNameTh] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formDescTh, setFormDescTh] = useState("");
  const [formDescEn, setFormDescEn] = useState("");
  const [formDuration, setFormDuration] = useState(60);
  const [formPrice, setFormPrice] = useState(0);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getServices();
      setServices(data.map(toService));
    } catch {
      setServices([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const resetForm = () => {
    setFormNameTh("");
    setFormNameEn("");
    setFormDescTh("");
    setFormDescEn("");
    setFormDuration(60);
    setFormPrice(0);
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (svc: ServiceData) => {
    setFormNameTh(svc.name_th);
    setFormNameEn(svc.name_en);
    setFormDescTh(svc.description_th || "");
    setFormDescEn(svc.description_en || "");
    setFormDuration(svc.duration);
    setFormPrice(svc.price);
    setEditingId(svc.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formNameTh.trim() || !formNameEn.trim() || formDuration <= 0 || formPrice < 0) return;

    const payload: Record<string, unknown> = {
      name_th: formNameTh.trim(),
      name_en: formNameEn.trim(),
      description_th: formDescTh.trim() || null,
      description_en: formDescEn.trim() || null,
      duration: formDuration,
      price: formPrice,
    };

    try {
      if (editingId) {
        await api.updateService(editingId, payload);
      } else {
        await api.createService(payload);
      }
      resetForm();
      fetchServices();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteService(id);
      fetchServices();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="font-heading text-xl md:text-2xl text-white">
          {t("manageServices")}
        </h1>
        <button
          onClick={openAddForm}
          className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all cursor-pointer"
        >
          + {t("addService")}
        </button>
      </div>

      {/* Summary */}
      <Card className="text-center !py-3 mb-4 md:mb-6">
        <p className="text-2xl font-bold text-accent-gold">{services.length}</p>
        <p className="text-white/40 text-xs mt-1">{t("totalServices")}</p>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-4">
          <h2 className="text-white font-semibold mb-3">
            {editingId ? t("editService") : t("addService")}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">{t("nameTh")} *</label>
                <input
                  type="text"
                  value={formNameTh}
                  onChange={(e) => setFormNameTh(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="นวดไทย..."
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">{t("nameEn")} *</label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Thai Massage..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">{t("duration")} *</label>
                <input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">{t("price")} *</label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  min={0}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg bg-accent-gold text-primary-dark font-medium text-sm hover:bg-accent-gold-dark transition-all cursor-pointer"
              >
                {t("save")}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-all cursor-pointer"
              >
                {locale === "th" ? "ยกเลิก" : "Cancel"}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Service List */}
      {loading ? (
        <p className="text-white/50 text-center py-8">
          {locale === "th" ? "กำลังโหลด..." : "Loading..."}
        </p>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => {
            const name = locale === "th" ? svc.name_th : svc.name_en;

            return (
              <Card key={svc.id}>
                <div className="flex items-center gap-3 md:gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-lg md:text-xl shrink-0">
                    💆
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm md:text-base truncate">
                      {name}
                    </h3>
                    <div className="flex gap-3 text-xs text-white/40 mt-0.5">
                      <span>{svc.duration} {locale === "th" ? "นาที" : "min"}</span>
                      <span className="text-accent-gold font-medium">{svc.price.toLocaleString()} ฿</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditForm(svc)}
                      className="px-3 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all cursor-pointer"
                    >
                      {t("editService")}
                    </button>
                    <button
                      onClick={() => handleDelete(svc.id)}
                      className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                    >
                      {t("deleteService")}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
