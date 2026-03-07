export interface Service {
  id: number;
  name: { th: string; en: string };
  duration: number;
  price: number;
  description: { th: string; en: string };
  image: string;
}

export const services: Service[] = [
  {
    id: 1,
    name: { th: "นวดแผนไทย", en: "Thai Massage" },
    duration: 60,
    price: 400,
    description: {
      th: "นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ",
      en: "Traditional Thai massage for muscle relaxation",
    },
    image: "/images/thai-massage.jpg",
  },
  {
    id: 2,
    name: { th: "นวดน้ำมัน", en: "Oil Massage" },
    duration: 60,
    price: 600,
    description: {
      th: "นวดน้ำมันอโรมา ผ่อนคลายลึก",
      en: "Aromatherapy oil massage for deep relaxation",
    },
    image: "/images/oil-massage.jpg",
  },
  {
    id: 3,
    name: { th: "นวดน้ำมัน", en: "Oil Massage" },
    duration: 120,
    price: 1000,
    description: {
      th: "นวดน้ำมันอโรมา 2 ชั่วโมง ผ่อนคลายอย่างเต็มที่",
      en: "2-hour aromatherapy oil massage for ultimate relaxation",
    },
    image: "/images/oil-massage-2h.jpg",
  },
  {
    id: 4,
    name: { th: "นวดเท้า", en: "Foot Massage" },
    duration: 60,
    price: 350,
    description: {
      th: "นวดเท้าและขา กดจุดสะท้อน",
      en: "Foot and leg reflexology massage",
    },
    image: "/images/foot-massage.jpg",
  },
  {
    id: 5,
    name: { th: "นวดศีรษะ คอ บ่า ไหล่", en: "Head & Shoulder Massage" },
    duration: 45,
    price: 300,
    description: {
      th: "นวดศีรษะ คอ บ่า ไหล่ แก้ออฟฟิศซินโดรม",
      en: "Head, neck & shoulder massage for office syndrome",
    },
    image: "/images/head-massage.jpg",
  },
];
