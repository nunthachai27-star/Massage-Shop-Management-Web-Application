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
    name: { th: "นวดไทย", en: "Thai Massage" },
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
    name: { th: "นวดน้ำมัน (อโรม่า) 1 ชม.", en: "Aroma Oil Massage 1 hr" },
    duration: 60,
    price: 600,
    description: {
      th: "นวดน้ำมันอโรม่า ผ่อนคลายลึก ในห้องส่วนตัวพร้อมห้องน้ำในตัว",
      en: "Aromatherapy oil massage in private room with en-suite bathroom",
    },
    image: "/images/oil-massage.jpg",
  },
  {
    id: 3,
    name: { th: "นวดน้ำมัน (อโรม่า) 1.5 ชม.", en: "Aroma Oil Massage 1.5 hr" },
    duration: 90,
    price: 800,
    description: {
      th: "นวดน้ำมันอโรม่า 1 ชั่วโมงครึ่ง ผ่อนคลายอย่างเต็มที่",
      en: "1.5-hour aromatherapy oil massage for deep relaxation",
    },
    image: "/images/oil-massage.jpg",
  },
  {
    id: 4,
    name: { th: "นวดน้ำมัน (อโรม่า) 2 ชม.", en: "Aroma Oil Massage 2 hr" },
    duration: 120,
    price: 1000,
    description: {
      th: "นวดน้ำมันอโรม่า 2 ชั่วโมง ผ่อนคลายสุดพิเศษ",
      en: "2-hour aromatherapy oil massage for ultimate relaxation",
    },
    image: "/images/oil-massage.jpg",
  },
];
