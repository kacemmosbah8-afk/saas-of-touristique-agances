import { describe, expect, it } from "vitest";

import { getMissingPublishRequirements } from "@/features/flights/lib/publish-requirements";

const complete = {
  basePrice: 350,
  coverImageUrl: "/seed-images/algiers-jordan.jpg",
  imageCount: 2,
};

describe("getMissingPublishRequirements (flights)", () => {
  it("returns nothing when every requirement is met", () => {
    expect(getMissingPublishRequirements(complete)).toEqual([]);
  });

  it("flags a missing price", () => {
    expect(getMissingPublishRequirements({ ...complete, basePrice: null })).toContain("a price");
  });

  it("flags no picture only when both cover and gallery are empty", () => {
    expect(
      getMissingPublishRequirements({ ...complete, coverImageUrl: null, imageCount: 0 }),
    ).toContain("at least one picture");
    expect(
      getMissingPublishRequirements({ ...complete, coverImageUrl: null, imageCount: 1 }),
    ).not.toContain("at least one picture");
    expect(
      getMissingPublishRequirements({ ...complete, coverImageUrl: "/x.jpg", imageCount: 0 }),
    ).not.toContain("at least one picture");
  });

  it("can report both missing requirements at once", () => {
    const missing = getMissingPublishRequirements({
      basePrice: null,
      coverImageUrl: null,
      imageCount: 0,
    });
    expect(missing).toHaveLength(2);
  });
});
