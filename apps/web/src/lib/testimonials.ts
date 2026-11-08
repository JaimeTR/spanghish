/**
 * Opiniones publicadas en la web actual (spanglish.com.au), con el texto tal
 * como lo escribieron: no se traducen ni se corrigen. `kind` indica el tipo de
 * alumno que el sitio actual muestra bajo cada nombre.
 */
export const TESTIMONIALS = [
  {
    name: "Kelvin",
    kind: "private",
    text: "Maribel is an excellent Spanish tutor. Her lessons are well prepared and structured with clear guidance in points of grammar. The lessons involve plenty of conversation in Spanish, and Maribel has great patience and understanding when explaining difficult points. Her English is also very good and I would recommend her to any student wanting to learn Spanish.",
  },
  {
    name: "Tia",
    kind: "private",
    text: "I’ve been doing Spanish lessons with Maribel for a couple months now and she’s an amazing teacher! She explains things so well and gives me homework every week. She checks on my progress and makes sure I’m getting the content. I highly recommend choosing Maribel",
  },
  {
    name: "Mitch",
    kind: "private",
    text: "Maribel is an excellent teacher. She is very well organised with great resources, she’s patient, and knowledgeable with the teaching of Spanish. I highly recommend her as I continue my weekly lessons.",
  },
  {
    name: "Ben",
    kind: "family",
    text: "Perfect! Maribel was kind but also pushed my partner and I to do better, which is what we wanted.",
  },
  {
    name: "Ella",
    kind: "private",
    text: "Perfect! Was a good introductory lesson with Maribel, she had good techniques and exercises to see what level I was.",
  },
] as const;

export type Testimonial = (typeof TESTIMONIALS)[number];
