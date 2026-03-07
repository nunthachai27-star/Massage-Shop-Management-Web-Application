import { createClient } from "@supabase/supabase-js";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function seed() {
  console.log("Seeding database...");

  // 1. Seed services
  const { error: servicesError } = await supabase.from("services").upsert(
    [
      {
        id: 1,
        name_th: "นวดแผนไทย",
        name_en: "Thai Massage",
        description_th: "นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ",
        description_en: "Traditional Thai massage for muscle relaxation",
        duration: 60,
        price: 400,
      },
      {
        id: 2,
        name_th: "นวดน้ำมัน",
        name_en: "Oil Massage",
        description_th: "นวดน้ำมันอโรมา ผ่อนคลายลึก",
        description_en: "Aromatherapy oil massage for deep relaxation",
        duration: 60,
        price: 600,
      },
      {
        id: 3,
        name_th: "นวดน้ำมัน 2 ชม.",
        name_en: "Oil Massage 2hr",
        description_th: "นวดน้ำมันอโรมา 2 ชั่วโมง ผ่อนคลายอย่างเต็มที่",
        description_en: "2-hour aromatherapy oil massage",
        duration: 120,
        price: 1000,
      },
      {
        id: 4,
        name_th: "นวดเท้า",
        name_en: "Foot Massage",
        description_th: "นวดเท้าและขา กดจุดสะท้อน",
        description_en: "Foot and leg reflexology massage",
        duration: 60,
        price: 350,
      },
      {
        id: 5,
        name_th: "นวดศีรษะ คอ บ่า ไหล่",
        name_en: "Head & Shoulder Massage",
        description_th: "แก้ออฟฟิศซินโดรม",
        description_en: "For office syndrome",
        duration: 45,
        price: 300,
      },
    ],
    { onConflict: "id" },
  );
  if (servicesError) console.error("Services error:", servicesError);
  else console.log("Services seeded");

  // 2. Seed therapists with PINs
  const { error: therapistsError } = await supabase.from("therapists").upsert(
    [
      {
        id: 1,
        name_th: "สมศรี สุขใจ",
        name_en: "Somsri Sukjai",
        skills: ["Thai Massage", "Foot Massage"],
        rating: 4.9,
        status: "offline",
        pin: "1234",
        experience: 10,
      },
      {
        id: 2,
        name_th: "วิภา ใจดี",
        name_en: "Wipa Jaidee",
        skills: ["Oil Massage", "Head & Shoulder"],
        rating: 4.8,
        status: "offline",
        pin: "5678",
        experience: 8,
      },
      {
        id: 3,
        name_th: "มาลี สวยงาม",
        name_en: "Malee Suayngam",
        skills: ["Thai Massage", "Oil Massage"],
        rating: 4.7,
        status: "offline",
        pin: "9012",
        experience: 5,
      },
      {
        id: 4,
        name_th: "นภา รักสุข",
        name_en: "Napa Raksuk",
        skills: ["Oil Massage", "Foot Massage"],
        rating: 4.6,
        status: "offline",
        pin: "3456",
        experience: 3,
      },
    ],
    { onConflict: "id" },
  );
  if (therapistsError) console.error("Therapists error:", therapistsError);
  else console.log("Therapists seeded");

  // 3. Seed beds
  const { error: bedsError } = await supabase.from("beds").upsert(
    [
      { id: 1, name: "Bed 1", status: "available" },
      { id: 2, name: "Bed 2", status: "available" },
      { id: 3, name: "Bed 3", status: "available" },
      { id: 4, name: "Bed 4", status: "available" },
    ],
    { onConflict: "id" },
  );
  if (bedsError) console.error("Beds error:", bedsError);
  else console.log("Beds seeded");

  // 4. Seed owner account
  const passwordHash = await bcrypt.hash("admin123", 10);
  const { error: staffError } = await supabase.from("staff").upsert(
    [
      {
        id: 1,
        username: "admin",
        password_hash: passwordHash,
        role: "owner",
        name: "Admin Owner",
      },
    ],
    { onConflict: "id" },
  );
  if (staffError) console.error("Staff error:", staffError);
  else console.log("Owner account seeded (admin / admin123)");

  console.log("\nSeed complete!");
  console.log("\nTest credentials:");
  console.log("  Owner: admin / admin123");
  console.log("  Therapist PINs: 1234, 5678, 9012, 3456");
}

seed().catch(console.error);
