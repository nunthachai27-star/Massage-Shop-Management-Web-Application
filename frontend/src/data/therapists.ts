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
    name: { th: "สมศรี สุขใจ", en: "Somsri Sukjai" },
    skill: ["Thai Massage", "Foot Massage"],
    rating: 4.9,
    status: "available",
    image: "/images/therapist-1.jpg",
    experience: 10,
  },
  {
    id: 2,
    name: { th: "วิภา ใจดี", en: "Wipa Jaidee" },
    skill: ["Oil Massage", "Head & Shoulder"],
    rating: 4.8,
    status: "available",
    image: "/images/therapist-2.jpg",
    experience: 8,
  },
  {
    id: 3,
    name: { th: "มาลี สวยงาม", en: "Malee Suayngam" },
    skill: ["Thai Massage", "Oil Massage"],
    rating: 4.7,
    status: "busy",
    image: "/images/therapist-3.jpg",
    experience: 5,
  },
  {
    id: 4,
    name: { th: "นภา รักสุข", en: "Napa Raksuk" },
    skill: ["Oil Massage", "Foot Massage"],
    rating: 4.6,
    status: "available",
    image: "/images/therapist-4.jpg",
    experience: 3,
  },
];
