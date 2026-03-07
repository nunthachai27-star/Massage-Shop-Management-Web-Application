export type TherapistStatus = "available" | "busy" | "break" | "offline";

export interface Therapist {
  id: number;
  name: { th: string; en: string };
  skill: string[];
  rating: number;
  status: TherapistStatus;
  image: string;
  experience: number;
}

export const therapists: Therapist[] = [
  {
    id: 1,
    name: { th: "หมอเจเจ", en: "Mor JJ" },
    skill: ["นวดไทย", "นวดอโรมา"],
    rating: 4.9,
    status: "available",
    image: "/images/therapist-1.jpg",
    experience: 10,
  },
  {
    id: 2,
    name: { th: "หมอเกิ้ล", en: "Mor Koil" },
    skill: ["นวดอโรมา", "นวดไทย"],
    rating: 4.8,
    status: "available",
    image: "/images/therapist-2.jpg",
    experience: 8,
  },
  {
    id: 3,
    name: { th: "หมอพลอย", en: "Mor Ploy" },
    skill: ["นวดไทย", "นวดอโรมา"],
    rating: 4.7,
    status: "available",
    image: "/images/therapist-3.jpg",
    experience: 5,
  },
  {
    id: 4,
    name: { th: "หมอเดียร์", en: "Mor Dear" },
    skill: ["นวดอโรมา", "นวดไทย"],
    rating: 4.6,
    status: "available",
    image: "/images/therapist-4.jpg",
    experience: 3,
  },
  {
    id: 5,
    name: { th: "หมอบี", en: "Mor Bee" },
    skill: ["นวดไทย", "นวดอโรมา"],
    rating: 4.8,
    status: "available",
    image: "/images/therapist-5.jpg",
    experience: 6,
  },
  {
    id: 6,
    name: { th: "หมอออม", en: "Mor Aom" },
    skill: ["นวดอโรมา", "นวดไทย"],
    rating: 4.7,
    status: "available",
    image: "/images/therapist-6.jpg",
    experience: 4,
  },
  {
    id: 7,
    name: { th: "หมอเค๊ก", en: "Mor Cake" },
    skill: ["นวดไทย", "นวดอโรมา"],
    rating: 4.5,
    status: "available",
    image: "/images/therapist-7.jpg",
    experience: 2,
  },
];
