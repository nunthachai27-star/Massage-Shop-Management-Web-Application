export interface Service {
  id: number;
  name: { th: string; en: string };
  duration: number;
  price: number;
  description: { th: string; en: string };
  image: string;
  category?: string;
}

export const services: Service[] = [
  {
    id: 1,
    name: { th: "นวดไทย 1 ชม.", en: "Thai Massage 1 hr" },
    duration: 60,
    price: 400,
    category: "thai",
    description: {
      th: "นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ",
      en: "Traditional Thai massage for muscle relaxation",
    },
    image: "/images/thai-massage.jpg",
  },
  {
    id: 2,
    name: { th: "นวดไทย 1.5 ชม.", en: "Thai Massage 1.5 hr" },
    duration: 90,
    price: 600,
    category: "thai",
    description: {
      th: "นวดแผนไทยโบราณ 1.5 ชั่วโมง",
      en: "Traditional Thai massage 1.5 hours",
    },
    image: "/images/thai-massage.jpg",
  },
  {
    id: 3,
    name: { th: "นวดไทย 2 ชม.", en: "Thai Massage 2 hr" },
    duration: 120,
    price: 800,
    category: "thai",
    description: {
      th: "นวดแผนไทยโบราณ 2 ชั่วโมง ผ่อนคลายเต็มที่",
      en: "Traditional Thai massage 2 hours for full relaxation",
    },
    image: "/images/thai-massage.jpg",
  },
  {
    id: 4,
    name: { th: "นวดอโรม่า 1 ชม.", en: "Aroma Massage 1 hr" },
    duration: 60,
    price: 600,
    category: "aroma",
    description: {
      th: "นวดน้ำมันอโรม่า ผ่อนคลายลึก",
      en: "Aromatherapy oil massage for deep relaxation",
    },
    image: "/images/oil-massage.jpg",
  },
  {
    id: 5,
    name: { th: "นวดอโรม่า 1.5 ชม.", en: "Aroma Massage 1.5 hr" },
    duration: 90,
    price: 800,
    category: "aroma",
    description: {
      th: "นวดน้ำมันอโรม่า 1.5 ชั่วโมง",
      en: "Aromatherapy oil massage 1.5 hours",
    },
    image: "/images/oil-massage.jpg",
  },
  {
    id: 6,
    name: { th: "นวดอโรม่า 2 ชม.", en: "Aroma Massage 2 hr" },
    duration: 120,
    price: 1000,
    category: "aroma",
    description: {
      th: "นวดน้ำมันอโรม่า 2 ชั่วโมง ผ่อนคลายสุดพิเศษ",
      en: "Aromatherapy oil massage 2 hours for ultimate relaxation",
    },
    image: "/images/oil-massage.jpg",
  },
];
