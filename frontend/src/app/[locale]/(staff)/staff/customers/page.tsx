"use client";

import { useState, useMemo } from "react";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { customers as mockCustomers, createCustomer, type Customer } from "@/data/customers";

export default function CustomersPage() {
  const locale = useLocale();
  const [customerList, setCustomerList] = useState<Customer[]>(mockCustomers);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customerList;
    const q = search.toLowerCase();
    return customerList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [search, customerList]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const customer = createCustomer(newName.trim(), newPhone.trim());
    setCustomerList((prev) => [...prev, customer]);
    setNewName("");
    setNewPhone("");
    setShowAdd(false);
  };

  const totalCustomers = customerList.length;
  const freeEligible = customerList.filter((c) => c.visitCount > 0 && c.visitCount % 5 === 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-white">
          {locale === "th" ? "ลูกค้าสะสมแต้ม" : "Customer Loyalty"}
        </h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            showAdd
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-accent-gold text-primary-dark"
          }`}
        >
          {showAdd
            ? (locale === "th" ? "ยกเลิก" : "Cancel")
            : (locale === "th" ? "+ เพิ่มลูกค้า" : "+ Add Customer")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-center py-2">
            <p className="text-white/50 text-xs mb-1">{locale === "th" ? "ลูกค้าทั้งหมด" : "Total Customers"}</p>
            <p className="text-accent-gold text-3xl font-bold">{totalCustomers}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-2">
            <p className="text-white/50 text-xs mb-1">{locale === "th" ? "ได้ฟรีครั้งถัดไป" : "Free Visit Eligible"}</p>
            <p className="text-green-400 text-3xl font-bold">{freeEligible}</p>
          </div>
        </Card>
      </div>

      {/* Add Customer Form */}
      {showAdd && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-white mb-4">
            {locale === "th" ? "เพิ่มลูกค้าใหม่" : "Add New Customer"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-white/50 text-xs mb-1">
                {locale === "th" ? "ชื่อลูกค้า *" : "Customer Name *"}
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={locale === "th" ? "กรอกชื่อลูกค้า" : "Enter name"}
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">
                {locale === "th" ? "เบอร์โทร (ไม่บังคับ)" : "Phone (optional)"}
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <p className="text-white/30 text-xs">
              {locale === "th"
                ? "ระบบจะสร้างรหัสลูกค้าอัตโนมัติ"
                : "A customer code will be generated automatically"}
            </p>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="w-full py-2.5 rounded-lg bg-accent-gold text-primary-dark font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all hover:bg-accent-gold-dark"
            >
              {locale === "th" ? "บันทึก" : "Save"}
            </button>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === "th" ? "ค้นหาชื่อ, รหัส, หรือเบอร์โทร..." : "Search name, code, or phone..."}
          className="w-full bg-surface-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        {filtered.map((customer) => {
          const current = customer.visitCount % 5;
          const isFree = current === 0 && customer.visitCount > 0;

          return (
            <Card key={customer.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-primary-dark font-bold text-sm shrink-0">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-medium">{customer.name}</h3>
                      <span className="text-accent-gold/60 font-mono text-xs">{customer.code}</span>
                    </div>
                    {customer.phone ? (
                      <p className="text-white/40 text-xs mt-0.5">{customer.phone}</p>
                    ) : (
                      <p className="text-white/20 text-xs mt-0.5 italic">
                        {locale === "th" ? "ไม่มีเบอร์โทร" : "No phone"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {isFree ? (
                    <Badge variant="green">{locale === "th" ? "ฟรี 1 ครั้ง!" : "FREE!"}</Badge>
                  ) : (
                    <span className="text-accent-gold text-sm font-medium">
                      {current}/5
                    </span>
                  )}
                  <p className="text-white/30 text-xs mt-1">
                    {locale === "th"
                      ? `รวม ${customer.visitCount} ครั้ง`
                      : `${customer.visitCount} total`}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex gap-1 mt-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      isFree
                        ? "bg-green-400"
                        : i <= current
                          ? "bg-accent-gold"
                          : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30">
              {locale === "th" ? "ไม่พบลูกค้า" : "No customers found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
