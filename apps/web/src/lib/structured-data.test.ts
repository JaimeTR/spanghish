import { describe, expect, it } from "vitest";
import { organizationJsonLd, serializeJsonLd } from "./structured-data";

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
