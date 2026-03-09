"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

type ApiRecord = Record<string, unknown>;

interface TherapistData {
  id: number;
  name_th: string;
  name_en: string;
  pin: string | null;
  status: string;
  is_active: boolean;
}

function toTherapist(r: ApiRecord): TherapistData {
  return {
    id: r.id as number,
    name_th: r.name_th as string,
    name_en: r.name_en as string,
    pin: (r.pin as string) || null,
    status: r.status as string,
    is_active: r.is_active as boolean,
  };
}

export default function ManageTherapistsPage() {
  const t = useTranslations("owner");
  const locale = useLocale();
  const [therapists, setTherapists] = useState<TherapistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formNameTh, setFormNameTh] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formPin, setFormPin] = useState("");

  const fetchTherapists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllTherapists();
      const list = data.map(toTherapist);
      list.sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
      setTherapists(list);
    } catch {
      setTherapists([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTherapists();
  }, [fetchTherapists]);

  const resetForm = () => {
    setFormNameTh("");
    setFormNameEn("");
    setFormPin("");
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (th: TherapistData) => {
    setFormNameTh(th.name_th);
    setFormNameEn(th.name_en);
    setFormPin("");
    setEditingId(th.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formNameTh.trim() || !formNameEn.trim()) return;

    const payload: Record<string, unknown> = {
      name_th: formNameTh.trim(),
      name_en: formNameEn.trim(),
    };
    if (formPin.trim()) payload.pin = formPin.trim();

    try {
      if (editingId) {
        await api.updateTherapist(editingId, payload);
      } else {
        await api.createTherapist(payload);
      }
      resetForm();
      fetchTherapists();
    } catch {
      // ignore
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await api.deactivateTherapist(id);
      fetchTherapists();
    } catch {
      // ignore
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await api.reactivateTherapist(id);
      fetchTherapists();
    } catch {
      // ignore
    }
  };

  const activeCount = therapists.filter((th) => th.is_active).length;
  const resignedCount = therapists.filter((th) => !th.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="font-heading text-xl md:text-2xl text-white">
          {t("manageTherapists")}
        </h1>
        <button
          onClick={openAddForm}
          className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all cursor-pointer"
        >
          + {t("addTherapist")}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-white/40 text-xs mt-1">{t("totalActive")}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-red-400">{resignedCount}</p>
          <p className="text-white/40 text-xs mt-1">{t("totalResigned")}</p>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-4">
          <h2 className="text-white font-semibold mb-3">
            {editingId ? t("editTherapist") : t("addTherapist")}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">{t("nameTh")}</label>
                <input
                  type="text"
                  value={formNameTh}
                  onChange={(e) => setFormNameTh(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="หมอ..."
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">{t("nameEn")}</label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Mor ..."
                />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">{t("pin")}</label>
              <input
                type="text"
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="1234"
                maxLength={4}
              />
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

      {/* Therapist List */}
      {loading ? (
        <p className="text-white/50 text-center py-8">
          {locale === "th" ? "กำลังโหลด..." : "Loading..."}
        </p>
      ) : (
        <div className="space-y-3">
          {therapists.map((th) => {
            const name = locale === "th" ? th.name_th : th.name_en;
            const initial = name.charAt(0);
            const isActive = th.is_active;

            return (
              <Card key={th.id} className={!isActive ? "opacity-60" : ""}>
                <div className="flex items-center gap-3 md:gap-4">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg shrink-0 ${
                      isActive
                        ? "bg-gradient-to-br from-accent-gold to-accent-gold-dark text-primary-dark"
                        : "bg-white/10 text-white/30"
                    }`}
                  >
                    {initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-white font-semibold text-sm md:text-base truncate">
                        {name}
                      </h3>
                      <Badge variant={isActive ? "green" : "gray"}>
                        {isActive ? t("active") : t("resigned")}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-white/40">
                      <span>PIN: {th.pin || (locale === "th" ? "ยังไม่ตั้ง" : "Not set")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {isActive && (
                      <>
                        <button
                          onClick={() => openEditForm(th)}
                          className="px-3 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all cursor-pointer"
                        >
                          {t("editTherapist")}
                        </button>
                        <button
                          onClick={() => handleDeactivate(th.id)}
                          className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
                        >
                          {t("deactivate")}
                        </button>
                      </>
                    )}
                    {!isActive && (
                      <button
                        onClick={() => handleReactivate(th.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer"
                      >
                        {t("reactivate")}
                      </button>
                    )}
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
