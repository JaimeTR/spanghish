import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  lessonServiceJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  teacherJsonLd,
} from "./structured-data";

describe("organizationJsonLd", () => {
  it("describes the school with real public data only", () => {
    const data = organizationJsonLd("en", "Spanish lessons");
    expect(data["@type"]).toEqual(["EducationalOrganization", "LocalBusiness"]);
    expect(data.telephone).toBe("+61413178583");
    expect(data.email).toBe("hello@spanglish.com.au");
    expect(data.url).toMatch(/\/en$/);
    expect(data.openingHoursSpecification.dayOfWeek).toHaveLength(6);
    expect(data.sameAs).toHaveLength(5);
    // Sin datos inventados: ni dirección, ni valoraciones, ni precios.
    expect(data).not.toHaveProperty("address");
    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).not.toHaveProperty("priceRange");
  });

  it("serializes without allowing a closing script tag", () => {
    expect(serializeJsonLd({ x: "</script>" })).not.toContain("</script>");
  });
});

describe("page JSON-LD", () => {
  it("lesson service links to the school and only carries published AUD prices", () => {
    const data = lessonServiceJsonLd({
      locale: "es",
      path: "/es/kids-lessons",
      name: "Clases para niños",
      description: "x",
      minAge: 6,
      maxAge: 13,
      offers: [{ description: "Grupo", minPrice: 30 }, { description: "Gratis", price: 0 }],
    });
    expect(data.provider["@id"]).toMatch(/#organization$/);
    expect(data.audience).toEqual({ "@type": "PeopleAudience", suggestedMinAge: 6, suggestedMaxAge: 13 });
    expect(data.offers[0]).toMatchObject({ priceCurrency: "AUD", priceSpecification: { minPrice: 30 } });
    expect(data.offers[1]).toMatchObject({ priceCurrency: "AUD", price: 0 });
    expect(data).not.toHaveProperty("aggregateRating");
  });

  it("teacher is a Person working for the school, without invented data", () => {
    const data = teacherJsonLd("/en/teachers", "Native tutor", "Spanish tutor");
    expect(data).toMatchObject({ "@type": "Person", name: "Maribel Mayhua", worksFor: { "@id": expect.stringMatching(/#organization$/) } });
    expect(data).not.toHaveProperty("address");
    expect(data).not.toHaveProperty("image");
  });

  it("breadcrumbs are numbered from 1 with absolute URLs", () => {
    const data = breadcrumbJsonLd([
      { name: "Inicio", path: "/es" },
      { name: "Contacto", path: "/es/contact-us" },
    ]);
    expect(data.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(data.itemListElement[1]!.item).toMatch(/^https?:\/\/.+\/es\/contact-us$/);
  });
});
